"""Validate completeness against independent inventories and the exported PDF."""
from pathlib import Path
import json,re,hashlib,xml.etree.ElementTree as E,subprocess
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2]
def read(path):return json.loads((ROOT/path).read_text())
register=read('docs/owner-settings-audit/setting-register.json');current=read('docs/owner-settings-audit/evidence/current-inventory.json');historical=read('docs/admin-settings-audit/evidence/definition-audit.json')['definitions']
manual_path=ROOT/'docs/user-manual/owner-settings-complete.md';manual=manual_path.read_text();entries=register['entries'];keys={r['key'] for r in entries}
assert len(keys)==len(entries)==77
assert keys=={d['key'] for d in current['definitions']}|{d['key'] for d in historical}
assert len(current['definitions'])==76 and len(current['categories'])==9
assert sum(x['auditStatus']=='HISTORICAL_RETAINED' for x in entries)==1
for x in entries:
 assert '`'+x['key']+'`' in manual,x['key']
 assert x['manualSectionAndAction'] and x['operationalAcceptance']=='NOT_CERTIFIED_BY_THIS_AUDIT'
for cat in current['categories']:assert f'### {cat} register' in manual
for text in ['NO-GO','sandbox/test payments only','independent','kobo','basis points','worker','restore','retain-all','Historical only','Current password','Settings branch','End trip','Change vehicle']:
 assert text.lower() in manual.lower(),text
for label,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',manual):
 if not target.startswith(('https://','http://','#')):assert (manual_path.parent/target.split('#')[0]).resolve().exists(),target
pdf_path=ROOT/'output/pdf/EasyGas-Owner-Settings-Configuration-Manual.pdf';pdf=PdfReader(pdf_path);text='\n'.join(p.extract_text() or '' for p in pdf.pages);flat=re.sub(r'\s+','',text)
for x in entries:assert re.sub(r'\s+','',x['key']) in flat,('PDF missing key',x['key'])
assert len(pdf.pages)>=20
assert pdf.outline and len(pdf.outline)==21,len(pdf.outline)
assert all(len(p.extract_text().strip())>120 for p in pdf.pages)
assert '\u25a0' not in text and '\ufffd' not in text
for n in range(1,8):assert f'OSA-0{n}' in text
for row in read('docs/owner-settings-audit/evidence/source-fingerprints.json')['files']:
 assert hashlib.sha256((ROOT/row['path']).read_bytes()).hexdigest()==row['sha256']
for file in ['apps/web/components/admin.tsx','apps/web/lib/governance.ts','apps/web/lib/payments/runtime.ts']:
 assert (ROOT/file).read_bytes()==subprocess.check_output(['git','show','ad0400c:'+file],cwd=ROOT)
report=dict(manualSha256=hashlib.sha256(manual_path.read_bytes()).hexdigest(),pdfSha256=hashlib.sha256(pdf_path.read_bytes()).hexdigest(),pdfPages=len(pdf.pages),outlineEntries=len(pdf.outline),settingKeysRetained=77,currentLocal=76,historicalOnly=1,excluded=0,linkedLocalResources='PASS',sourceImmutability='PASS',pdfTextAndKeyCoverage='PASS',commercialAcceptance='NOT_CERTIFIED',newMobileBinary=False)
(ROOT/'docs/owner-settings-audit/evidence/artifact-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
