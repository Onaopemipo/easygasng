"""Read the exact signed IPA; check latest workflow/permissions and unpack icons for inspection."""
import argparse,json,pathlib,plistlib,zipfile
parser=argparse.ArgumentParser();parser.add_argument('--ipa',type=pathlib.Path,required=True);parser.add_argument('--report',type=pathlib.Path,required=True);parser.add_argument('--extract',type=pathlib.Path,required=True);args=parser.parse_args()
assert not args.extract.exists(),'Use a fresh task-owned extraction directory';args.extract.mkdir(parents=True)
with zipfile.ZipFile(args.ipa) as z:
 for entry in z.infolist():
  dest=(args.extract/entry.filename).resolve();assert dest.is_relative_to(args.extract.resolve()),'Unsafe archive path'
 z.extractall(args.extract)
app,=list((args.extract/'Payload').glob('*.app'));info=plistlib.loads((app/'Info.plist').read_bytes());bundle=(app/'main.jsbundle').read_bytes()
terms=['Weigh and refill','Save scale readings','daily.refill.record','Proof photo verified by the server. Ready to complete delivery.','Delivery records are up to date.','Accept order','Delivery Completed'];found={term:term.encode() in bundle for term in terms};assert all(found.values()),found
qa_absent=b'http://127.0.0.1:3198' not in bundle;assert qa_absent
camera=info.get('NSCameraUsageDescription','');photos=info.get('NSPhotoLibraryUsageDescription','');assert 'consent' in camera.lower();assert 'consent' in photos.lower();assert not info.get('NSMicrophoneUsageDescription')
result={'status':'PASS','workflowStrings':found,'qaAdapterAbsent':qa_absent,'cameraDescriptionPresent':True,'cameraUsageDescription':camera,'photosUsageDescription':photos,'microphonePermissionAbsent':True,'scope':'Exact signed IPA static workflow strings/permission metadata; physical camera and installed lifecycle acceptance not inferred'};args.report.write_text(json.dumps(result,indent=2)+'\n');print('PASS exact signed workflow features, consented camera/photo permissions, no microphone or simulator adapter');print('Extracted app: '+str(app))
