#!/usr/bin/env python3
"""Read-only historical workbook reconciliation. NO database or import commit capability.
Source literals, formulas and saved caches remain distinct. Outputs may contain PII:
write only to a private, ignored review directory. Never place them under web/public.
"""
from __future__ import annotations
import argparse, csv, hashlib, html, json, os, re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path, PurePosixPath

NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
MAPPING_VERSION='easygas-excel-review-v1'
HEADERS={'A':'Category (unlabelled source header)','B':'Name of Customer','C':'Phone Number','D':'Customer Address','E':'Delivery Date','F':'50kg Received Stock','G':'12.5kg Received Stock','H':'Top Ups Received Stock','I':'Gas Qty Sold (KG)','J':'# of Cylinders','K':'Expected Stock Balance','L':'LPG Selling/Cost Price','M':'Delivery Fee Charged','N':'Actual Balance on Whatsapp','O':'Variance','P':'End Users','Q':'Corporate Customers','R':'Next Refill Date','S':'Expected Totals','T':'Accessories','U':'Unit','V':'Amount','W':'Actual Received','X':'Date Received','Y':'Name of Payer','Z':'Gas Installation','AA':'Credit'}
MONEY=['L','M','N','V','W','Z','AA']
MAIN='Inventory-Online Delivery'

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def jsonable(value):
    if isinstance(value,Decimal):return int(value) if value==value.to_integral_value() else float(value)
    if isinstance(value,(date,datetime)):return value.isoformat()
    raise TypeError(type(value).__name__)
def dump(path:Path,obj):
    path.write_text(json.dumps(obj,default=jsonable,ensure_ascii=False,indent=2)+'\n');path.chmod(0o600)
def number(value):
    if value is None or value=='':return None
    if isinstance(value,bool):return None
    if isinstance(value,Decimal):return value if value.is_finite() else None
    if isinstance(value,(int,float)):
        v=Decimal(str(value));return v if v.is_finite() else None
    try:
        s=re.sub(r'^(?:₦|NGN)\s*','',str(value).strip())
        if not re.fullmatch(r'[+-]?(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)',s):return None
        d=Decimal(s.replace(',',''))
        return d if d.is_finite() else None
    except (InvalidOperation,ValueError):return None

def zero(value):return number(value) or Decimal(0)
def present(value):return value is not None and str(value).strip()!=''
def excel_date(value,system1904=False):
    if value is None or value=='':return None
    n=number(value)
    if n is not None:
        if not system1904 and Decimal(60)<=n<Decimal(61):raise ValueError('Excel fictitious 1900-02-29')
        base=datetime(1904,1,1) if system1904 else datetime(1899,12,30) if n>=60 else datetime(1899,12,31)
        return (base+timedelta(seconds=float(n*86400))).date().isoformat()
    s=str(value).strip()
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:T.*)?',s):return date.fromisoformat(s[:10]).isoformat()
    raise ValueError('Ambiguous/non-ISO date; no day/month guessing')
def colnum(s):
    v=0
    for x in s:v=v*26+ord(x)-64
    return v
def colname(v):
    out=''
    while v:v,m=divmod(v-1,26);out=chr(65+m)+out
    return out

def translate_formula(formula,origin,target):
    a=re.fullmatch(r'([A-Z]+)(\d+)',origin);b=re.fullmatch(r'([A-Z]+)(\d+)',target)
    dc=colnum(b[1])-colnum(a[1]);dr=int(b[2])-int(a[2])
    # Quoted string constants are never interpreted as references.
    tokens=re.split(r'("(?:[^"]|"")*")',formula)
    def change(m):
        c=colnum(m[2])+(0 if m[1] else dc);r=int(m[4])+(0 if m[3] else dr)
        return '#REF!' if c<1 or r<1 else f'{m[1]}{colname(c)}{m[3]}{r}'
    for i in range(0,len(tokens),2):tokens[i]=re.sub(r'(?<![A-Za-z0-9_])([$]?)([A-Z]{1,3})([$]?)(\d+)',change,tokens[i])
    return ''.join(tokens)

def read_workbook(path:Path):
    original=path.read_bytes();filehash=sha(original)
    if len(original)>20_000_000:raise ValueError('Source exceeds20MB review limit')
    with zipfile.ZipFile(path) as z:
        infos=z.infolist()
        if len(infos)>2500 or sum(x.file_size for x in infos)>80_000_000:raise ValueError('Workbook expanded size/entry limit exceeded')
        if any(x.filename.startswith('/') or '..' in PurePosixPath(x.filename).parts for x in infos):raise ValueError('Unsafe ZIP member path')
        if any(x.file_size>30_000_000 for x in infos):raise ValueError('Oversized XML member')
        shared=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS):shared.append(''.join(x.text or '' for x in si.findall('.//m:t',NS)))
        wb=ET.fromstring(z.read('xl/workbook.xml'));pr=wb.find('m:workbookPr',NS)
        date1904=pr is not None and pr.get('date1904') in ('1','true')
        rels={a.get('Id'):a for a in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        styles=[];formats={14:'mm-dd-yy',22:'m/d/yy h:mm',0:'General',49:'@'}
        if 'xl/styles.xml' in z.namelist():
            st=ET.fromstring(z.read('xl/styles.xml'))
            for x in st.findall('m:numFmts/m:numFmt',NS):formats[int(x.get('numFmtId'))]=x.get('formatCode')
            for x in st.findall('m:cellXfs/m:xf',NS):styles.append(formats.get(int(x.get('numFmtId','0')),f'builtin:{x.get("numFmtId")}'))
        result={'auditCreatedAt':datetime.now(timezone.utc).isoformat(),'reviewer':None,'originalFileName':path.name,'mappingVersion':MAPPING_VERSION,'sha256':filehash,'bytes':len(original),'dateSystem':'1904' if date1904 else '1900','definedNames':[{'attributes':a.attrib,'reference':a.text} for a in wb.findall('m:definedNames/m:definedName',NS)],'externalLinks':[x for x in z.namelist() if 'externalLink' in x],'macros':[x for x in z.namelist() if 'vbaproject' in x.lower()],'sheets':[]}
        for s in wb.findall('m:sheets/m:sheet',NS):
            rel=rels[s.get('{'+REL+'}id')]
            if rel.get('TargetMode')=='External':raise ValueError('External worksheet relationship is not opened')
            target=rel.get('Target');name=target.lstrip('/') if target.startswith('/') else 'xl/'+target
            if '..' in PurePosixPath(name).parts:raise ValueError('Unsafe sheet relationship')
            root=ET.fromstring(z.read(name));masters={};cells={};rowattrs={}
            for row in root.findall('m:sheetData/m:row',NS):
                rowattrs[row.get('r')]=dict(row.attrib)
                for c in row.findall('m:c',NS):
                    ref=c.get('r');v=c.find('m:v',NS);f=c.find('m:f',NS);kind=c.get('t','n');raw=v.text if v is not None else None
                    inline=c.find('m:is',NS)
                    value=shared[int(raw)] if kind=='s' and raw is not None else ''.join(x.text or '' for x in inline.findall('.//m:t',NS)) if inline is not None else raw
                    if kind=='n' and raw is not None:
                        try:value=Decimal(raw)
                        except InvalidOperation:value=raw
                    cell={'ref':ref,'kind':kind,'raw':raw,'value':value,'formula':f.text if f is not None else None,'hasFormula':f is not None,'formulaAttributes':dict(f.attrib) if f is not None else {},'styleIndex':int(c.get('s','0')),'numberFormat':styles[int(c.get('s','0'))] if styles else 'General'}
                    if f is not None and f.get('t')=='shared' and f.text:masters[f.get('si')]=(ref,f.text)
                    cells[ref]=cell
            for c in cells.values():
                if c['hasFormula'] and c['formula'] is None and c['formulaAttributes'].get('t')=='shared':
                    master=masters.get(c['formulaAttributes'].get('si'))
                    c['formula']=translate_formula(master[1],master[0],c['ref']) if master else None
            result['sheets'].append({'name':s.get('name'),'state':s.get('state','visible'),'rowCount':len(rowattrs),'rowAttributes':rowattrs,'hiddenRows':[int(r) for r,a in rowattrs.items() if a.get('hidden')=='1'],'hiddenColumns':[c.attrib for c in root.findall('m:cols/m:col',NS) if c.get('hidden')=='1'],'mergedCells':[a.get('ref') for a in root.findall('m:mergeCells/m:mergeCell',NS)],'cells':cells,'dataValidations':[{'attributes':a.attrib,'formulas':[x.text for x in a]} for a in root.findall('m:dataValidations/m:dataValidation',NS)]})
    if sha(path.read_bytes())!=filehash:raise RuntimeError('Source changed while reading')
    return result

def value(sheet,col,row):return sheet['cells'].get(f'{col}{row}',{}).get('value')
def formula(sheet,col,row):return sheet['cells'].get(f'{col}{row}',{}).get('formula')
def phone_key(raw):
    if raw is None:return None
    s=str(raw).strip().lstrip("'");s=re.sub(r'[\s().-]','',s)
    # No country code, missing leading zero, or extension is manufactured.
    return s if re.fullmatch(r'0[789][01]\d{8}|\+234[789][01]\d{8}|234[789][01]\d{8}',s) else None

def classify(values,literal_columns,has_formulas):
    if not literal_columns:return 'FORMULA_ONLY' if has_formulas else 'EMPTY'
    cat=str(values.get('A') or '').strip().lower();gas=zero(values.get('I'))*zero(values.get('J'));receipt=zero(values.get('F'))+zero(values.get('G'))+zero(values.get('H'))
    accessory=zero(values.get('V'))>0;service=str(values.get('T') or '').strip().lower()=='service' or zero(values.get('Z'))>0
    if cat=='stock' and receipt==0 and gas==0 and present(values.get('K')) and 'K' in literal_columns:return 'OPENING_BALANCE'
    if cat=='stock' and receipt>0:return 'MIXED_EVENT' if gas>0 or accessory or service else 'STOCK_RECEIPT'
    if cat=='credit':return 'CREDIT_OR_PAYMENT_NOTE'
    if cat=='shop sales':return 'SHOP_SALE'
    if cat in ('end users','corporate customer','corporate customers','bulk buyer'):
        if gas>0:return 'MIXED_EVENT' if accessory or service else 'CUSTOMER_ORDER'
        if service:return 'INSTALLATION_OR_SERVICE'
        if accessory:return 'ACCESSORY_SALE'
    return 'AMBIGUOUS'

def csv_safe(value):
    s='' if value is None else str(value)
    return "'"+s if re.match(r'^[\s]*[=+\-@\t\r]',s) else s

def save_csv(path,fieldnames,rows):
    with path.open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=fieldnames);w.writeheader()
        for row in rows:w.writerow({k:("'"+str(row.get(k)) if k in ('phone_original','source_phone') and row.get(k) is not None else csv_safe(row.get(k))) for k in fieldnames})
    path.chmod(0o600)

def audit(book,asof,target=None):
    sheet=next((s for s in book['sheets'] if s['name']==MAIN),None)
    if sheet is None:raise ValueError('Expected operational worksheet is missing; mapping is not guessed')
    rows=[];excluded=Counter();exceptions=[];formula_errors=[];formula_mismatches=[]
    def exception(r,kind,severity,evidence,action):
        key=f'{book["sha256"]}:{MAIN}:{r}:{kind}';exceptions.append({'exception_id':sha(key.encode())[:20],'source_row':r,'source_sheet':MAIN,'type':kind,'severity':severity,'evidence':evidence,'proposed_action':action,'reviewer':'','status':'PENDING_CUSTOMER_CONFIRMATION','resolution_reason':'','created_at':book.get('auditCreatedAt',''),'reviewed_at':''})
    maxrow=max(int(re.sub('[A-Z]','',ref)) for ref in sheet['cells'])
    categories=Counter();fees=Counter();money=Counter();kg=Decimal(0);receipts=Decimal(0);opening=None;running=None;asof_receipts=Decimal(0);asof_sales=Decimal(0);row_balances=[];future_rows=[];numeric_phone_rows=[];price_rates=Counter();last_stock=None;undated_movements=[];unparsed_money=[]
    for r in range(2,maxrow+1):
        cells={c:sheet['cells'].get(f'{c}{r}',{}) for c in HEADERS};values={c:a.get('value') for c,a in cells.items()}
        if isinstance(values['C'],Decimal):values['C']=format(values['C'],'f').split('.')[0] if values['C']==values['C'].to_integral_value() else format(values['C'],'f')
        literal=[c for c,a in cells.items() if not a.get('hasFormula') and present(a.get('value'))]
        hasform=any(a.get('hasFormula') for a in cells.values());kind=classify(values,literal,hasform)
        if kind in ('FORMULA_ONLY','EMPTY'):excluded[kind]+=1;continue
        categories[str(values['A']) if present(values['A']) else '<blank>']+=1
        rowid=sha(f'{book["sha256"]}:{MAIN}:{r}'.encode());source_hash=sha(json.dumps(cells,default=jsonable,sort_keys=True).encode())
        dates={}
        for col in ['E','X','R']:
            try:dates[col]=excel_date(values[col],book['dateSystem']=='1904')
            except (ValueError,OverflowError):dates[col]=None;exception(r,'INVALID_DATE' if col!='R' else 'REFILL_FORMULA_ERROR','P1',f'{col}{r}: invalid date or cached formula error','Confirm source date; do not infer from adjacent rows')
        if dates['E'] and dates['E']>asof:future_rows.append(r);exception(r,'FUTURE_DATED_ACTIVITY','P1',f'E{r}={dates["E"]}; review date={asof}','Confirm future plan versus date error; exclude from historical cutover until resolved')
        for c in MONEY:
            if present(values[c]) and number(values[c]) is None:
                unparsed_money.append({'row':r,'cell':f'{c}{r}','raw':str(values[c])});exception(r,'UNPARSED_MONEY_EVIDENCE','P1',f'{c}{r} is not a valid number: {values[c]}','Confirm the intended amount; excluded from numeric totals, not silently corrected')
            money[c]+=zero(values[c])
        if present(values['M']):fees[str(zero(values['M']))]+=1
        sold=zero(values['I'])*zero(values['J']);stock_in=zero(values['F'])*50+zero(values['G'])*Decimal('12.5')+zero(values['H']);kg+=sold;receipts+=stock_in
        if dates['E'] and dates['E']<=asof:asof_receipts+=stock_in;asof_sales+=sold
        if not dates['E'] and (stock_in or sold):
            undated_movements.append({'row':r,'receiptsKg':stock_in,'gasKg':sold});exception(r,'UNDATED_STOCK_MOVEMENT','P1',f'E{r} missing; receipts={stock_in}kg, sales={sold}kg','Confirm movement date before an as-of stock balance can be determined')
        if kind=='OPENING_BALANCE':
            if opening is None:opening=zero(values['K']);running=opening
            else:exception(r,'MULTIPLE_OPENING_ANCHORS','P1',f'Additional literal opening anchor K{r}','Operations must choose the valid cutover anchor')
        elif running is not None:running+=stock_in-sold
        cached_stock=number(values['K'])
        if cached_stock is not None and running is not None:
            delta=cached_stock-running;row_balances.append({'row':r,'cached':cached_stock,'recomputed':running,'variance':delta,'kind':kind})
            if delta:exception(r,'STOCK_RUNNING_VARIANCE','P1',f'K{r} cache={cached_stock}; independent rollforward={running}; variance={delta}','Confirm the original entry and units; no balancing adjustment proposed')
            if cached_stock<0:exception(r,'NEGATIVE_SOURCE_STOCK','P1',f'K{r}={cached_stock}','Investigate source chronology, missing receipts or prior overdraw')
            last_stock=cached_stock
        if running is not None and running<0:exception(r,'NEGATIVE_RECOMPUTED_STOCK','P1',f'Independent stock at row{r}={running}','Confirm opening/receipt/sales chronology; do not import a balancing adjustment')
        if kind=='AMBIGUOUS':exception(r,'AMBIGUOUS_ROW','P1',f'Category={values["A"] or "blank"}; gas calculation={sold}kg','Confirm event category and whether this is a real transaction or placeholder')
        if kind=='MIXED_EVENT':exception(r,'MIXED_EVENT','P1',f'Gas={sold}kg; amount V{r}={values["V"]}','Split linked proposed events after confirming amounts are not included elsewhere')
        if stock_in:
            exception(r,'STOCK_UNIT_AND_CUTOVER_REVIEW','P1',f'F{r}*50 + G{r}*12.5 + H{r}={stock_in}kg under source formula convention','Confirm package units and receipt date; separate purchase evidence from physical stocktake')
            if present(values['B']):exception(r,'STOCK_ROW_IN_CUSTOMER_LAYOUT','P2',f'Stock row has B{r} populated','Confirm supplier/stock reference; do not create customer order from the name')
        if sold and (zero(values['I'])<=0 or zero(values['J'])<=0):exception(r,'INVALID_GAS_UNIT','P1',f'I{r} and J{r} do not form positive quantity','Confirm units')
        if present(values['I']) != present(values['J']):exception(r,'INCOMPLETE_GAS_FACTORS','P1',f'I{r}/J{r}: one factor is blank','Do not default cylinder count or infer capacity')
        if number(values['J']) is not None and number(values['J'])%1:exception(r,'NONINTEGER_CYLINDER_COUNT','P1',f'J{r}={values["J"]}','Confirm source cylinder units')
        if sold:
            price_rates[str(zero(values['L'])/sold)]+=1
            exception(r,'UNVERIFIED_CYLINDER_CAPACITY_CUSTODY','P2',f'I{r} × J{r} records purchased gas, not serialized cylinder capacity/inspection','Keep cylinder eligibility/custody and forecast-training fields unset')
        if kind in ('CUSTOMER_ORDER','SHOP_SALE','MIXED_EVENT','ACCESSORY_SALE','INSTALLATION_OR_SERVICE') or sold:
            if not present(values['B']):exception(r,'MISSING_CUSTOMER_NAME','P1',f'B{r} is blank','Customer match review required')
            if not present(values['C']):exception(r,'MISSING_CONTACT','P1',f'C{r} is blank','Do not infer phone from similarly named people')
            elif phone_key(values['C']) is None:exception(r,'UNVERIFIED_PHONE_FORMAT','P1',f'C{r} has an unsupported/missing-prefix phone representation','Preserve exact source string; customer must confirm digits/country code')
            if not dates['E']:exception(r,'MISSING_ACTIVITY_DATE','P1',f'E{r} is blank or invalid','Do not manufacture a completed delivery date or dormant status')
            if not present(values['W']):exception(r,'UNKNOWN_PAYMENT_EVIDENCE','P1',f'W{r} is blank; no settlement evidence in this row','Finance must confirm bank/cash evidence; blank does not establish debt')
        if present(values['C']) and cells['C'].get('kind')=='n':numeric_phone_rows.append(r);exception(r,'NUMERIC_PHONE_STORAGE','P2',f'C{r} is stored numerically','Preserve original digits and number format; lost leading zeros cannot be recovered without confirmation')
        if present(values['W']):
            exception(r,'UNVERIFIED_RECORDED_RECEIPT','P1',f'W{r} records {values["W"]}; bank/cash verification not supplied','Match payer/date/reference and allocations against authorised settlement evidence')
            if not present(values['X']) or not present(values['Y']):exception(r,'INCOMPLETE_RECEIPT_METADATA','P1',f'W{r} populated but X{r} or Y{r} missing','Finance must supply payer/payment date and transaction reference')
            combined=zero(values['L'])+zero(values['M'])+zero(values['V'])+zero(values['Z'])
            if number(values['W']) is not None and zero(values['W'])!=combined:exception(r,'RECORDED_PAYMENT_COMPONENT_DIFFERENCE','P1',f'W{r}={values["W"]}; L+M+V+Z={combined}; difference={zero(values["W"])-combined}','Confirm partial/shared/duplicate receipt or inclusion in another row; no receivable inferred')
        if present(values['V']):exception(r,'ACCESSORY_SERVICE_AMOUNT_BASIS','P1',f'T/U/V{r} populated; amount={values["V"]}','Confirm line total versus unit price and gas/payment overlap; V is not multiplied by U in recorded totals')
        if zero(values['M']) not in (0,5000):exception(r,'HISTORICAL_FEE_VARIATION','P1',f'M{r}={values["M"]}','Confirm historical fee; preserve it and never substitute the current fee')
        for c,a in cells.items():
            if a.get('kind')=='e' or (a.get('hasFormula') and str(a.get('value','')).startswith(('#REF!','#VALUE!','#DIV/0!'))):
                formula_errors.append({'row':r,'cell':f'{c}{r}','cache':a.get('value'),'formula':a.get('formula')});exception(r,'FORMULA_ERROR','P1',f'{c}{r} cache={a.get("value")}','Retain original formula/cache; customer must correct source or explicitly exclude the derived field')
        lf=formula(sheet,'L',r)
        if lf and re.fullmatch(r'\d+(?:\.\d+)?\*I\d+\*J\d+',lf):
            rate=Decimal(lf.split('*')[0]);expected=rate*sold
            if number(values['L'])!=expected:formula_mismatches.append({'cell':f'L{r}','cached':values['L'],'recomputed':expected});exception(r,'FORMULA_CACHE_MISMATCH','P1',f'L{r} saved={values["L"]}; arithmetic={expected}','Confirm workbook recalculation before using derived value')
        rf=formula(sheet,'R',r)
        if rf:
            match=re.search(r'IF\(A(\d+)=',rf)
            if match and int(match[1])!=r:exception(r,'CROSS_ROW_REFILL_REFERENCE','P2',f'R{r} uses A{match[1]}','Review shifted source formula; exclude it from live forecasts')
            if '"end user"' in rf and str(values['A']).lower()=='end users':exception(r,'REFILL_CATEGORY_MISMATCH','P2',f'R{r} tests singular end user, while A{r} is End Users','Source selects corporate assumption; do not import as verified refill prediction')
        rows.append({'sourceRowId':rowid,'sourceRow':r,'sheet':MAIN,'mappingVersion':MAPPING_VERSION,'sourceHash':source_hash,'category':values['A'],'classification':kind,'values':values,'cells':cells,'dates':dates,'phoneKey':phone_key(values['C']),'gasKgFormulaConvention':sold,'receiptsKgFormulaConvention':stock_in,'customerName':str(values['B'] or '').strip(),'address':str(values['D'] or '').strip(),'commitEligible':False,'refillTrainingEligible':False,'dormantState':'UNKNOWN_DATA'})
    # Source-only candidate clusters are review groups, never identity merges.
    namegroups=defaultdict(list);phonegroups=defaultdict(list);signatures=defaultdict(list)
    for row in rows:
        if row['customerName'] and row['classification'] not in ('OPENING_BALANCE','STOCK_RECEIPT'):
            namegroups[re.sub(r'\s+',' ',row['customerName']).casefold()].append(row)
        if row['phoneKey']:phonegroups[row['phoneKey']].append(row)
        signature=tuple(str(row['values'][c] or '') for c in ['A','B','C','D','E','I','J','L','M','V','W'])
        if row['gasKgFormulaConvention'] or present(row['values']['W']):signatures[signature].append(row)
    for group in signatures.values():
        if len(group)>1:
            for row in group:exception(row['sourceRow'],'DUPLICATE_TRANSACTION_CANDIDATE','P1','Identical selected source fields across rows '+','.join(str(x['sourceRow']) for x in group),'Confirm duplicate versus repeated legitimate event; do not auto-delete or merge')
    for name,group in namegroups.items():
        if len(group)>1:
            for row in group:exception(row['sourceRow'],'REPEATED_NAME_REVIEW','P2','Same normalized name on rows '+','.join(str(x['sourceRow']) for x in group),'Name alone is insufficient to match or merge customers')
    for key,group in phonegroups.items():
        names={x['customerName'].casefold() for x in group if x['customerName']}
        if len(names)>1:
            for row in group:exception(row['sourceRow'],'SHARED_PHONE_REVIEW','P1','Phone appears with multiple name aliases on rows '+','.join(str(x['sourceRow']) for x in group),'Confirm shared household/business phone and separate people before matching')
    customers=[];target_customers=target.get('customers',[]) if target else []
    for row in rows:
        if row['classification'] in ('OPENING_BALANCE','STOCK_RECEIPT'):continue
        matches=[]
        for candidate in target_customers:
            verified_key=phone_key(candidate.get('contact_phone')) if candidate.get('phone_verified_at') else None
            exact_verified=bool(row['phoneKey'] and row['phoneKey']==verified_key)
            name_equal=bool(row['customerName'] and row['customerName'].casefold()==str(candidate.get('name','')).strip().casefold())
            if exact_verified or name_equal:matches.append({'id':candidate['id'],'publicCustomerId':candidate.get('public_customer_id'),'name':candidate['name'],'branchId':candidate.get('branch_id'),'evidence':'TARGET_VERIFIED_PHONE_EXACT_SOURCE_UNVERIFIED' if exact_verified else 'NAME_ONLY_NOT_SUFFICIENT'})
        customers.append({'sourceRow':row['sourceRow'],'sourceRowId':row['sourceRowId'],'name':row['customerName'],'sourcePhone':row['values']['C'],'phoneKey':row['phoneKey'],'address':row['address'],'targetCandidates':matches,'decision':'PENDING_CUSTOMER_CONFIRMATION','selectedCustomerId':None,'verifiedPhone':False,'marketingConsent':False,'reviewer':'','reason':''})
    proposed=[]
    for row in rows:
        types=[]
        if row['gasKgFormulaConvention']:types.append('LEGACY_GAS_ACTIVITY')
        if row['receiptsKgFormulaConvention']:types.append('STOCK_RECEIPT_EVIDENCE')
        if present(row['values']['V']):types.append('SERVICE_AMOUNT_EVIDENCE' if str(row['values']['T']).strip().lower()=='service' else 'ACCESSORY_AMOUNT_EVIDENCE')
        if present(row['values']['W']):types.append('UNVERIFIED_RECEIPT_EVIDENCE')
        if row['classification']=='OPENING_BALANCE':types.append('OPENING_BALANCE_EVIDENCE')
        if not types:types.append('AMBIGUOUS_LEGACY_NOTE')
        for event in types:proposed.append({'eventId':sha(f'{row["sourceRowId"]}:{event}:{MAPPING_VERSION}'.encode()),'sourceRowId':row['sourceRowId'],'sourceRow':row['sourceRow'],'eventType':event,'proposedModel':{'LEGACY_GAS_ACTIVITY':'existing order/history provenance adapter, not checkout','STOCK_RECEIPT_EVIDENCE':'existing approved gas_stock_movements after cutover review','UNVERIFIED_RECEIPT_EVIDENCE':'finance evidence staging, never verified_payments automatically','OPENING_BALANCE_EVIDENCE':'operations/finance approved stocktake cutover, never direct balance edit'}.get(event,'existing item/service history model after reviewed mapping'),'status':'HOLD_FOR_REVIEW','commitEligible':False})
    stock_rows=[x for x in row_balances if x['variance']]
    summary={'sourceSha256':book['sha256'],'mappingVersion':MAPPING_VERSION,'asOfLagosDate':asof,'mode':'AUDIT_PREVIEW_ONLY','importApproved':False,'commitCapability':False,'targetBusinessWrites':0,'targetProposedExecutableWrites':0,'reviewEventCandidates':len(proposed),'sheetNames':[x['name'] for x in book['sheets']],'operationalColumns':len(HEADERS),'meaningfulRows':len(rows),'sourceCategoryCounts':dict(categories),'classifications':dict(Counter(r['classification'] for r in rows)),'excludedRows':dict(excluded),'formulaCells':sum(c['hasFormula'] for s in book['sheets'] for c in s['cells'].values()),'formulaErrors':formula_errors,'formulaCacheMismatches':formula_mismatches,'gasKgFormulaConvention':kg,'gasKgCategorizedOnly':sum(r['gasKgFormulaConvention'] for r in rows if present(r['category'])),'receiptKgFormulaConvention':receipts,'openingAnchorKg':opening,'calculatedClosingIncludingFutureKg':running,'lastCachedStockKg':last_stock,'stockVarianceRows':stock_rows,'asOfCalculatedStockKg':None if opening is None or undated_movements else opening+asof_receipts-asof_sales,'datedMovementsOnlyDiagnosticKg':None if opening is None else opening+asof_receipts-asof_sales,'excludingFutureAssumingUndatedBeforeCutoffKg':None if opening is None else running-sum(r['receiptsKgFormulaConvention']-r['gasKgFormulaConvention'] for r in rows if r['sourceRow'] in future_rows),'undatedMovements':undated_movements,'unparsedMoneyEvidence':unparsed_money,'asOfReceiptKg':asof_receipts,'asOfGasSoldKg':asof_sales,'futureDatedRows':future_rows,'recordedFieldTotals':{HEADERS[c]:money[c] for c in MONEY},'feeDistribution':dict(fees),'impliedGasRateDistribution':dict(price_rates),'rawDistinctNonemptyNames':len({r['customerName'] for r in rows if r['customerName']}),'nonStockNormalizedNameGroups':len(namegroups),'nonStockRepeatedNameGroups':sum(len(g)>1 for g in namegroups.values()),'distinctPhoneKeys':len(phonegroups),'sharedPhoneGroups':sum(len({r['customerName'].casefold() for r in g if r['customerName']})>1 for g in phonegroups.values()),'numericPhoneRows':numeric_phone_rows,'customerReviewRows':len(customers),'customerRowsWithTargetCandidates':sum(bool(r['targetCandidates']) for r in customers),'customerMatchesApproved':0,'recordedReceiptRows':sum(present(r['values']['W']) for r in rows),'numericReceiptRows':sum(number(r['values']['W']) is not None for r in rows),'missingReceiptFieldRows':sum(not present(r['values']['W']) for r in rows),'exceptionCount':len(exceptions),'exceptionTypes':dict(Counter(x['type'] for x in exceptions)),'targetSnapshotAvailable':target is not None,'targetCounts':target.get('counts') if target else None,'physicalStockVerified':False,'paymentsIndependentlyVerified':False,'forecastsEligible':0,'dormantCustomersVerified':0}
    return {'summary':summary,'rows':rows,'exceptions':exceptions,'customerReview':customers,'eventCandidates':proposed,'stockBridge':row_balances}

def html_preview(result):
    s=result['summary'];esc=lambda v:html.escape(str(v),quote=True)
    money=lambda x:f'₦{float(x):,.0f}'
    cards=[('Rows requiring review',s['meaningfulRows']),('Gas under source formula',f"{s['gasKgFormulaConvention']:,.1f} kg"),('Recorded gas value',money(s['recordedFieldTotals']['LPG Selling/Cost Price'])),('Recorded receipts, unverified',money(s['recordedFieldTotals']['Actual Received'])),('Source closing incl. future',f"{s['lastCachedStockKg']} kg"),('As-of-date calculation',('UNKNOWN — undated movements' if s['asOfCalculatedStockKg'] is None else f"{s['asOfCalculatedStockKg']} kg")),('Approved matches / writes','0 / 0'),('Exceptions',s['exceptionCount'])]
    def table(headers,body):return '<table><thead><tr>'+''.join('<th>'+esc(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(v)+'</td>' for v in row)+'</tr>' for row in body)+'</tbody></table>'
    rows=table(['Row','Category','Classification','Customer','Phone as recorded','Activity date','Gas kg','Gas amount','Delivery fee','Received','Decision'],[[r['sourceRow'],r['category'] or 'UNLABELLED',r['classification'],r['customerName'],r['values']['C'] or '',r['dates']['E'] or 'UNKNOWN',r['gasKgFormulaConvention'],r['values']['L'],r['values']['M'],r['values']['W'],'HOLD — not imported'] for r in result['rows']])
    exceptions=table(['Row','Type','Severity','Evidence','Required action'],[[x['source_row'],x['type'],x['severity'],x['evidence'],x['proposed_action']] for x in result['exceptions']])
    return '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'"><title>EasyGas historical migration review</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#17392a;background:#f5f8f4;margin:0}main{max-width:1440px;margin:auto;padding:32px}h1{font-size:32px;margin-bottom:8px}h2{font-size:24px;margin-top:32px}a{color:#006235}.notice{background:#fff1d4;border-left:5px solid #c88212;padding:18px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:24px 0}.card{background:#fff;padding:18px;border:1px solid #d9e4da;border-radius:12px}.card strong{font-size:25px;display:block}.scroll{overflow:auto;background:#fff;border:1px solid #d9e4da;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:15px}th{background:#0c4630;color:white;text-align:left;position:sticky;top:0}td,th{padding:12px;vertical-align:top;border-bottom:1px solid #e3eae4}td{max-width:420px;min-width:90px;overflow-wrap:anywhere}summary{cursor:pointer;padding:12px;font-weight:600}.subtle{color:#52675b}code{overflow-wrap:anywhere}</style><main><p>EASYGAS / HISTORICAL DATA REVIEW</p><h1>Workbook reconciliation and migration preview</h1><p class="subtle">As of '''+esc(s['asOfLagosDate'])+''' in Lagos. Recorded values are not verified settlements or physical stock.</p><div class="notice"><strong>No import approved. Target business writes: 0.</strong><br>Customer confirmation is required for payment allocations, physical stock/cutoff and units, historical fees, and row-level identity matches. This page has no approval, upload, commit, dispatch or messaging action.</div><div class="cards">'''+''.join('<div class="card">'+esc(label)+'<strong>'+esc(v)+'</strong></div>' for label,v in cards)+'''</div><h2>Decisions required</h2><ol><li>Confirm receipts against bank/cash evidence. Blank receipts do not prove debt.</li><li>Confirm row225 (unlabelled0.5kg), row282 (29November50kg receipt), undated rows94/239/274, the85kg opening anchor and a physical stocktake at the cutoff.</li><li>Confirm historical₦4,000 and₦5,000 fees without repricing history.</li><li>Confirm customer matches. Names, shared phones and spreadsheet presence do not verify identity or consent.</li></ol><p><a href="exceptions.csv">Download exception register</a> · <a href="customer-review.csv">Download customer match review</a> · <a href="row-review.csv">Download row preview</a> · <a href="event-proposals.json">Download non-executable event proposals</a></p><h2>Source controls</h2>'''+table(['Control','Value'],[[k,json.dumps(v,default=jsonable)] for k,v in s.items() if k in ('sourceCategoryCounts','classifications','excludedRows','feeDistribution','impliedGasRateDistribution','exceptionTypes','targetCounts')])+'''<h2>Rows and provenance</h2><p>Every row is held. Source fields are preserved; no customer is automatically matched. The secure provenance JSON retains formulas, cached values, formats and original source cells.</p><div class="scroll">'''+rows+'''</div><h2>Exceptions</h2><details><summary>Expand all row-level exceptions</summary><div class="scroll">'''+exceptions+'''</div></details><p class="subtle">Private customer information. Keep this review package in the restricted local folder. Source SHA256: <code>'''+esc(s['sourceSha256'])+'''</code></p></main></html>'''

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--workbook',required=True,type=Path);p.add_argument('--output',required=True,type=Path);p.add_argument('--as-of',required=True);p.add_argument('--target-snapshot',type=Path);a=p.parse_args(argv)
    date.fromisoformat(a.as_of)
    repo=Path(__file__).resolve().parents[1];out=a.output.resolve();private_root=repo/'.data'/'excel-preview'
    if not out.is_relative_to(private_root.resolve()):p.error('PII output must stay inside ignored .data/excel-preview')
    if out==a.workbook.resolve() or a.workbook.resolve().is_relative_to(out):p.error('Never place source workbook inside generated output')
    out.mkdir(parents=True,exist_ok=True);out.chmod(0o700)
    book=read_workbook(a.workbook)
    existing=out/'source-preservation.json'
    if existing.exists() and json.loads(existing.read_text()).get('before')!=book['sha256']:raise ValueError('Revised workbook requires a separate review directory; existing version is preserved')
    provenance=out/'source-provenance.json'
    if provenance.exists() and json.loads(provenance.read_text()).get('sha256')!=book['sha256']:raise ValueError('Existing partial preview belongs to another workbook revision')
    dump(out/'review-state.json',{'state':'BUILDING','sourceSha256':book['sha256'],'importApproved':False,'targetBusinessWrites':0})
    target=json.loads(a.target_snapshot.read_text()) if a.target_snapshot else None
    result=audit(book,a.as_of,target)
    dump(out/'source-provenance.json',book);dump(out/'review.json',result);dump(out/'summary.json',result['summary']);dump(out/'event-proposals.json',result['eventCandidates'])
    save_csv(out/'exceptions.csv',['exception_id','source_sheet','source_row','type','severity','evidence','proposed_action','reviewer','status','resolution_reason','created_at','reviewed_at'],result['exceptions'])
    save_csv(out/'row-review.csv',['source_row','source_row_id','category','classification','name','phone_original','address','activity_date','gas_kg','gas_value','delivery_fee','accessory_service_amount','recorded_received','payment_date','payer','proposed_target_writes','decision'],[{'source_row':r['sourceRow'],'source_row_id':r['sourceRowId'],'category':r['category'],'classification':r['classification'],'name':r['customerName'],'phone_original':r['values']['C'],'address':r['address'],'activity_date':r['dates']['E'],'gas_kg':r['gasKgFormulaConvention'],'gas_value':r['values']['L'],'delivery_fee':r['values']['M'],'accessory_service_amount':r['values']['V'],'recorded_received':r['values']['W'],'payment_date':r['dates']['X'],'payer':r['values']['Y'],'proposed_target_writes':0,'decision':'HOLD'} for r in result['rows']])
    save_csv(out/'customer-review.csv',['source_row','source_row_id','name','source_phone','address','candidate_target_ids','candidate_evidence','decision','selected_target_id','reviewer','resolution_reason'],[{'source_row':r['sourceRow'],'source_row_id':r['sourceRowId'],'name':r['name'],'source_phone':r['sourcePhone'],'address':r['address'],'candidate_target_ids':';'.join(c['id'] for c in r['targetCandidates']),'candidate_evidence':';'.join(c['evidence'] for c in r['targetCandidates']),'decision':r['decision']} for r in result['customerReview']])
    page=out/'index.html';page.write_text(html_preview(result));page.chmod(0o600)
    after=sha(a.workbook.read_bytes());dump(out/'source-preservation.json',{'before':book['sha256'],'after':after,'unchanged':after==book['sha256'],'originalSavedOrRecalculated':False,'importApproved':False,'targetBusinessWrites':0})
    if after!=book['sha256']:raise RuntimeError('Original source changed during preview')
    dump(out/'review-state.json',{'state':'READY_FOR_CUSTOMER_REVIEW_NOT_APPROVED','sourceSha256':book['sha256'],'importApproved':False,'targetBusinessWrites':0,'requiredConfirmations':['payments','stock balance and cutoff','historical delivery fees','customer matches']})
    print(json.dumps(result['summary'],default=jsonable,indent=2))
    return 0
if __name__=='__main__':raise SystemExit(main())
