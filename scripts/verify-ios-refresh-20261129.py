"""Verify exact latest-fix iOS TestFlight release evidence without building or mutating accounts."""
import hashlib,json,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[1]
folder=root/'docs/ios-testflight-refresh-20261129'
load=lambda p:json.loads((root/p).read_text())
pre=json.loads((folder/'preflight.json').read_text());count=0

def check(name,condition):
 global count
 assert condition,name
 count+=1
 print(f'PASS IOS29-{count:02}: {name}')

check('All current native/shared/configuration hashes match frozen release manifest',all(hashlib.sha256((root/p).read_bytes()).hexdigest()==h for p,h in pre['sourceFiles'].items()))
check('Deterministic source manifest matches inspected upload',hashlib.sha256(json.dumps(pre['sourceFiles'],sort_keys=True,separators=(',',':')).encode()).hexdigest()==pre['sourceManifestSha256'] and pre['archiveVerified']['applicationFilesMatched']==len(pre['sourceFiles']) and pre['archiveVerified']['secretsAndDependenciesExcluded'] and pre['archiveVerified']['qaGalleryAdapterExcluded'])
check('Approved HTTPS demo, existing app/team/project, normal entry and signed device profile', [pre['apiOrigin'],pre['bundleIdentifier'],pre['appleTeamId'],pre['ascAppId'],pre['expoProjectId'],pre['profile'],pre['archiveVerified']['normalEntry']]==['https://easygas-client-demo.vercel.app','com.easygasng.customer','RDQ9JJZH7F','6838122026','1c2f8055-9c7b-4d6e-bc43-a531544da41b','production','index.ts'])
prior=load('docs/ios-testflight-refresh-20261125/preflight.json')
review=load('docs/ios-testflight-refresh-20261129/dependency-review.json');lock=load('apps/mobile/package-lock.json')
check('Reviewed asset/constants repair preserves existing encryption implementation and cryptographic dependencies',pre['sourceFiles']['apps/mobile/field-crypto.ts']==prior['sourceFiles']['apps/mobile/field-crypto.ts'] and all(hashlib.sha256(json.dumps(lock['packages'][p],sort_keys=True,separators=(',',':')).encode()).hexdigest()==h for p,h in review['cryptoEntryHashes'].items()))
check('Executed30 release/security/component tests, native types and iOS export passed',pre['preflightTests']=={'passed':30,'failed':0,'skipped':0,'nativeTypecheck':'PASS','nativeExport':'PASS'})
check('Hosted API ready in approved demo scope',load('docs/ios-testflight-refresh-20261129/api-status.json')=={'status':'ready','scope':'demo'})
rtm=load('docs/traceability/store-testing-20261123-rtm.json')
check('Six stable requirements/gates and historical Android/build5/NO-GO retained',len(rtm['requirements'])==6 and len(rtm['gates'])==6 and rtm['coverage']['excluded']==0 and 'iosRefresh20261125' in rtm and not rtm['iosRefresh20261129']['androidChanged'] and 'NO-GO' in rtm['productionDecision'])
if '--final' in sys.argv:
 artifact=load('docs/ios-testflight-refresh-20261129/artifact-verification.json');icon=load('docs/ios-testflight-refresh-20261129/icon-verification.json');features=load('docs/ios-testflight-refresh-20261129/bundle-features.json');sub=load('docs/ios-testflight-refresh-20261129/submission.json');apple=load('docs/ios-testflight-refresh-20261129/apple-status.json')
 check('Exact signed device IPA matches source, build and all eight archive checks',artifact['buildId']==pre['buildId'] and artifact['buildNumber']==pre['buildNumber'] and artifact['packagingCommit']==pre['packagingCommit'] and len(artifact['checks'])==8 and all(x['status']=='PASS' for x in artifact['checks']))
 check('Approved packaged iPhone/iPad icons and latest daily/photo/sync features verified',icon['status']=='PASS' and len(icon['icons'])>=2 and features['status']=='PASS' and features['qaAdapterAbsent'] and features['cameraDescriptionPresent'] and features['microphonePermissionAbsent'])
 check('Exact EAS submission finished; Apple build VALID and internally testing',sub['status']=='FINISHED' and sub['buildId']==pre['buildId'] and apple['build']['easBuildId']==pre['buildId'] and apple['build']['easSubmissionId']==sub['id'] and apple['build']['buildNumber']==pre['buildNumber'] and apple['build']['processingState']=='VALID' and apple['build']['internalState']=='IN_BETA_TESTING')
 check('Same two internal testers and existing group with saved What to Test notes',sub['groupId']=='2ee5b345-71af-4aa0-85d4-816ce27dbb58' and sub['internalTesters']==2 and sub['testerIdsUnchanged'] and not sub['automaticFutureBuildAccessChanged'] and sub['testNotesSaved'])
 check('All six retained distribution requirements and gates are verified',rtm['coverage']['verified']==6 and all(x['status']=='VERIFIED_COMPLETE' for x in rtm['requirements']) and all(x['status']=='PASS' for x in rtm['gates']))
 for q in rtm['requirements']:
  assert q['reason'] and q['outstandingWork'] and q['dataSource'] and q['securityControl']
  for p in q['implementationFiles']+q['testFiles']+q['evidence']:assert (root/p).exists(),p
print(f'tests {count}\npass {count}\nfail 0\nskipped 0\nInternal distribution acceptance only; installed/physical/provider/production holds remain.')
