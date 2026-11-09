import unittest, importlib.util, tempfile, zipfile, json, re, os, hashlib
from pathlib import Path
from decimal import Decimal
SPEC=importlib.util.spec_from_file_location('preview',Path(__file__).resolve().parents[2]/'scripts/easygas_excel_preview.py');p=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(p)

def cell(ref,value=None,kind='n',formula=None,style=0):
    return {'ref':ref,'kind':kind,'raw':str(value) if value is not None else None,'value':value,'hasFormula':formula is not None,'formula':formula,'formulaAttributes':{},'styleIndex':style,'numberFormat':'General'}
def book(rows):
    cells={}
    for row,vals in rows.items():
        for col,val in vals.items():cells[f'{col}{row}']=val if isinstance(val,dict) else cell(f'{col}{row}',Decimal(str(val)) if isinstance(val,(int,float)) else val,'n' if isinstance(val,(int,float)) else 's')
    return {'sha256':'a'*64,'dateSystem':'1900','sheets':[{'name':p.MAIN,'cells':cells}], 'definedNames':[]}

class PreviewTests(unittest.TestCase):
 def test_MIG_02_03_formula_and_cache_do_not_make_blank_rows_transactions(self):
    b=book({2:{'A':'Stock','E':46023,'K':85},3:{'K':cell('K3',Decimal(85),formula='K2'),'L':cell('L3',Decimal(0),formula='1500*I3*J3')}})
    r=p.audit(b,'2026-11-05');self.assertEqual(len(r['rows']),1);self.assertEqual(r['summary']['excludedRows']['FORMULA_ONLY'],1);self.assertEqual(r['summary']['targetBusinessWrites'],0)
 def test_MIG_04_excel_dates_and_leap_day(self):
    self.assertEqual(p.excel_date(1), '1900-01-01');self.assertEqual(p.excel_date(0,True),'1904-01-01')
    self.assertEqual(p.excel_date(61),'1900-03-01')
    with self.assertRaises(ValueError):p.excel_date(60)
    with self.assertRaises(ValueError):p.excel_date('03/04/2026')
 def test_MIG_05_phone_strings_do_not_invent_prefixes(self):
    b=book({2:{'A':'End Users','B':'Fictional','C':Decimal('8.021111118E9'),'I':6,'J':1,'E':46023}})
    b['sheets'][0]['cells']['C2']=cell('C2',Decimal('8.021111118E9'))
    r=p.audit(b,'2026-11-05');self.assertIsInstance(r['rows'][0]['values']['C'],str);self.assertEqual(r['rows'][0]['values']['C'],'8021111118');self.assertIsNone(r['rows'][0]['phoneKey'])
    self.assertEqual(p.phone_key('0802 111 1118'),'08021111118')
 def test_MIG_06_07_08_matches_are_candidates_only_and_names_never_merge(self):
    b=book({2:{'A':'End Users','B':'Household A','C':'08021111118','I':6,'J':1,'E':46023},3:{'A':'End Users','B':'Household B','C':'08021111118','I':6,'J':1,'E':46024}})
    target={'customers':[{'id':'target','name':'Household A','contact_phone':'08021111118','phone_verified_at':'2026-01-01','public_customer_id':'EGC-fixture','branch_id':'fixture'}]}
    r=p.audit(b,'2026-11-05',target);self.assertEqual(r['summary']['sharedPhoneGroups'],1);self.assertEqual(r['summary']['customerMatchesApproved'],0)
    self.assertTrue(r['customerReview'][0]['targetCandidates']);self.assertTrue(all(x['selectedCustomerId'] is None for x in r['customerReview']))
 def test_MIG_10_11_12_16_17_mixed_row_mass_and_historical_price_are_preserved(self):
    b=book({2:{'A':'Stock','E':46023,'K':85},3:{'A':'End Users','B':'Fixture','I':12.5,'J':2,'L':35000,'M':4000,'T':'Hose','V':3500,'E':46024,'K':60}})
    r=p.audit(b,'2026-11-05');self.assertEqual(r['rows'][1]['classification'],'MIXED_EVENT');self.assertEqual(r['summary']['gasKgFormulaConvention'],Decimal(25));self.assertEqual(r['summary']['recordedFieldTotals']['LPG Selling/Cost Price'],35000);self.assertEqual(r['summary']['feeDistribution'],{'4000':1})
 def test_MIG_13_14_15_48_undated_and_future_stock_never_becomes_cutover(self):
    b=book({2:{'A':'Stock','E':46023,'K':85},3:{'A':'Stock','F':1,'K':135},4:{'A':'Stock','E':p.number('46355'),'F':1,'K':185}})
    r=p.audit(b,'2026-11-05');self.assertIsNone(r['summary']['asOfCalculatedStockKg']);self.assertFalse(r['summary']['physicalStockVerified']);self.assertFalse(r['summary']['importApproved']);self.assertTrue(r['summary']['futureDatedRows'])
 def test_MIG_18_19_20_no_debt_or_double_count_from_blank_text_receipts(self):
    self.assertIsNone(p.number('284000,'));self.assertEqual(p.number('284,000'),284000);self.assertEqual(p.number(Decimal('2.84E5')),284000)
    b=book({2:{'A':'End Users','I':6,'J':1,'L':9000,'M':4000,'T':'Hose','U':2,'V':3500,'W':'284000,'}})
    r=p.audit(b,'2026-11-05');self.assertEqual(r['summary']['recordedFieldTotals']['Actual Received'],0);self.assertEqual(r['summary']['recordedFieldTotals']['Amount'],3500);self.assertFalse(r['summary']['paymentsIndependentlyVerified']);self.assertEqual(len(r['summary']['unparsedMoneyEvidence']),1)
 def test_MIG_21_22_23_24_25_source_ids_and_no_commit_capability(self):
    b=book({2:{'A':'End Users','I':6,'J':1,'L':9000}});a=p.audit(b,'2026-11-05');c=p.audit(b,'2026-11-05');self.assertEqual(a['eventCandidates'],c['eventCandidates']);b['sha256']='b'*64;new=p.audit(b,'2026-11-05');self.assertNotEqual(a['eventCandidates'][0]['eventId'],new['eventCandidates'][0]['eventId']);self.assertFalse(a['summary']['commitCapability']);self.assertTrue(all(not e['commitEligible'] for e in a['eventCandidates']))
 def test_MIG_29_30_31_32_33_34_35_36_38_39_hold_every_business_effect(self):
    r=p.audit(book({2:{'A':'End Users','I':6,'J':1,'L':9000}}),'2026-11-05');self.assertTrue(all(not x['refillTrainingEligible'] and x['dormantState']=='UNKNOWN_DATA' for x in r['rows']));self.assertTrue(all(not x['marketingConsent'] and not x['verifiedPhone'] for x in r['customerReview']));self.assertEqual(r['summary']['targetBusinessWrites'],0)
 def test_MIG_42_43_export_injection_and_formula_text_safety(self):
    for s in ['=HYPERLINK("x")','+123','@SUM(A1)','-1','  =1']:self.assertTrue(p.csv_safe(s).startswith("'"))
    self.assertEqual(p.translate_formula('K2+(F3*50)+($I3*J3)+IF(A3="A1",1,0)','K3','K4'),'K3+(F4*50)+($I4*J4)+IF(A4="A1",1,0)')
    r=p.audit(book({2:{'A':'End Users','B':'<script>bad()</script>','I':6,'J':1,'L':9000}}),'2026-11-05');page=p.html_preview(r);self.assertNotIn('<script>bad()',page);self.assertIn("script-src 'none'",page);self.assertNotIn('form action=',page)
 def test_MIG_01_02_47_actual_workbook_and_saved_totals(self):
    source=Path(os.environ.get('EASYGAS_REVIEW_WORKBOOK','/Users/philipog/Downloads/Easygas Inventory 2026(1).xlsx'))
    if not source.exists():self.skipTest('Actual private workbook not available')
    before=p.sha(source.read_bytes());b=p.read_workbook(source);r=p.audit(b,'2026-11-05');s=r['summary']
    self.assertEqual(s['sheetNames'],['Inventory-Online Delivery','KeyInputs']);self.assertEqual(s['meaningfulRows'],282);self.assertEqual(s['excludedRows']['FORMULA_ONLY'],721);self.assertEqual(s['gasKgFormulaConvention'],Decimal('5894'));self.assertEqual(s['gasKgCategorizedOnly'],Decimal('5893.5'));self.assertEqual(s['receiptKgFormulaConvention'],5875);self.assertEqual(s['lastCachedStockKg'],66);self.assertFalse(s['stockVarianceRows']);self.assertIsNone(s['asOfCalculatedStockKg']);self.assertEqual(s['recordedFieldTotals']['Actual Received'],5162700);self.assertEqual(s['recordedFieldTotals']['Amount'],580000);self.assertEqual(s['recordedFieldTotals']['LPG Selling/Cost Price'],10423400);self.assertEqual(p.sha(source.read_bytes()),before)
    self.assertEqual(s['futureDatedRows'],[282]);self.assertEqual(s['unparsedMoneyEvidence'][0]['cell'],'W67');self.assertEqual(s['formulaErrors'][0]['cell'],'R275')

if __name__=='__main__':unittest.main(verbosity=2)
