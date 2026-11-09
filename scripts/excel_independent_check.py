"""Independent read-only check using bundled openpyxl, never saves workbook."""
import json,hashlib,re
from decimal import Decimal
from pathlib import Path
from collections import Counter
from openpyxl import load_workbook
source=Path('/Users/philipog/Downloads/Easygas Inventory 2026(1).xlsx');before=hashlib.sha256(source.read_bytes()).hexdigest()
f=load_workbook(source,read_only=True,data_only=False,keep_links=False);v=load_workbook(source,read_only=True,data_only=True,keep_links=False)
fr=list(f.worksheets[0].iter_rows(min_row=2,max_col=27));vr=list(v.worksheets[0].iter_rows(min_row=2,max_col=27,values_only=True))
active=[]
for i,(original,cache) in enumerate(zip(fr,vr),2):
 if any(c.data_type!='f' and c.value is not None and str(c.value).strip() for c in original):active.append((i,cache))
def n(x):
 if isinstance(x,(int,float,Decimal)):return Decimal(str(x))
 if isinstance(x,str) and re.fullmatch(r'\d+(?:\.\d+)?',x):return Decimal(x)
 return Decimal(0)
summary={'method':'Independent openpyxl read-only formula/cache pair; source never saved','sourceSha256':before,'meaningfulRows':len(active),'sourceCategoryCounts':dict(Counter(str(r[0]) if r[0] else '<blank>' for _,r in active)),'gasKg':str(sum(n(r[8])*n(r[9]) for _,r in active)),'receiptsKg':str(sum(n(r[5])*50+n(r[6])*Decimal('12.5')+n(r[7]) for _,r in active)),'gasValue':str(sum(n(r[11]) for _,r in active)),'fees':str(sum(n(r[12]) for _,r in active)),'recordedNumericReceived':str(sum(n(r[22]) for _,r in active)),'accessoryServiceAmount':str(sum(n(r[21]) for _,r in active)),'savedClosingStock':str(vr[-1][10]),'sourceUnchanged':hashlib.sha256(source.read_bytes()).hexdigest()==before}
primary=json.loads(Path('docs/audits/excel-evidence/workbook-summary.json').read_text())
checks={'rows':summary['meaningfulRows']==primary['meaningfulRows'],'categoryCounts':summary['sourceCategoryCounts']==primary['sourceCategoryCounts'],'kg':Decimal(summary['gasKg'])==Decimal(str(primary['gasKgFormulaConvention'])),'receiptsKg':Decimal(summary['receiptsKg'])==primary['receiptKgFormulaConvention'],'gasValue':Decimal(summary['gasValue'])==primary['recordedFieldTotals']['LPG Selling/Cost Price'],'fees':Decimal(summary['fees'])==primary['recordedFieldTotals']['Delivery Fee Charged'],'received':Decimal(summary['recordedNumericReceived'])==primary['recordedFieldTotals']['Actual Received'],'amount':Decimal(summary['accessoryServiceAmount'])==primary['recordedFieldTotals']['Amount']}
summary['comparisons']=checks;summary['allMatched']=all(checks.values());print(json.dumps(summary,indent=2));assert summary['allMatched'] and summary['sourceUnchanged']
f.close();v.close()
