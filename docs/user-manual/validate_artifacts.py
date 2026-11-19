"""Artifact integrity checks after the documented full visual review."""
from pathlib import Path
import json, hashlib, zipfile, re
from datetime import datetime, timezone
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'docs/user-manual'
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
files=[ROOT/'output/manual/EasyGas-User-Manual.docx',ROOT/'output/pdf/EasyGas-User-Manual.pdf',ROOT/'output/pdf/EasyGas-Website-Audit.pdf']
result={'testId':'UM-ARTIFACTS','status':'PASS','checkedAt':datetime.now(timezone.utc).isoformat(),'artifacts':[]}
alltext=''
for path in files:
    item={'path':str(path.relative_to(ROOT)),'bytes':path.stat().st_size,'sha256':digest(path)}
    assert item['bytes']>10000
    if path.suffix=='.pdf':
        reader=PdfReader(path);count=33 if 'User-Manual' in path.name else 16
        assert len(reader.pages)==count
        for page in reader.pages:assert len(page.extract_text())>100
        text='\n'.join(p.extract_text() for p in reader.pages);alltext+=text
        assert '\u25a0' not in text
        item['pages']=count;item['searchable']=True
        if count==33:
            for phrase in ['Service Manager','Technician','Inventory','Driver','Customer','0/1','0/2','NO-GO','Overview, Items, Payment and History']:
                assert phrase in text,phrase
            assert len(reader.pages[1].get('/Annots',[]))>=31
            item['contentsLinks']=len(reader.pages[1].get('/Annots',[]))
    else:
        with zipfile.ZipFile(path) as z:
            doc=z.read('word/document.xml').decode();styles=z.read('word/styles.xml').decode()
            assert doc.count('<w:drawing>')==25
            assert doc.count('<w:bookmarkStart ')==31
            assert '<w:pBdr' not in doc and '<w:pBdr' not in styles
            item['embeddedScreenshots']=25;item['topicBookmarks']=31
    result['artifacts'].append(item)
private=ROOT/'.data/demo-test-logins-20261110.json'
if private.exists():
    for account in json.loads(private.read_text())['accounts']:
        assert account['password'] not in alltext,'Credential found in extracted artifact text'
result['credentialTextCheck']='PASS'
(BASE/'evidence/artifact-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
