#!/usr/bin/env python3
"""Cross-check actual release observations against the frozen application manifest."""
import hashlib, json, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
folder = root / 'docs/ios-testflight-refresh-20261125'
load = lambda p: json.loads((root / p).read_text())
pre = load('docs/ios-testflight-refresh-20261125/preflight.json')
count = 0

def check(label, action):
    global count
    action()
    count += 1
    print('✔ IOS25-%02d: %s' % (count, label))

def equal(a, b):
    assert a == b, (a, b)

def sources():
    for name, sha in pre['sourceFiles'].items():
        equal(hashlib.sha256((root / name).read_bytes()).hexdigest(), sha)
    digest = hashlib.sha256(json.dumps(pre['sourceFiles'], sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    equal(digest, pre['sourceManifestSha256'])
check('Current native/shared source matches frozen build manifest, including uncommitted additions', sources)
check('Existing API, application identity and EAS project retained', lambda: equal(
    [pre['apiOrigin'],pre['bundleIdentifier'],pre['appleTeamId'],pre['ascAppId'],pre['expoProjectId']],
    ['https://easygas-client-demo.vercel.app','com.easygasng.customer','RDQ9JJZH7F','6838122026','1c2f8055-9c7b-4d6e-bc43-a531544da41b']))
prior = load('docs/ios-testflight-refresh-20261124/preflight.json')
def crypto():
    for f in ['apps/mobile/field-crypto.ts','apps/mobile/package.json','apps/mobile/package-lock.json']:
        equal(pre['sourceFiles'][f], prior['sourceFiles'][f])
check('Encryption source and dependency locks match previously approved build4', crypto)
check('Actual inspected EAS archive includes every application source and excludes credentials', lambda: equal(
    pre['archiveVerified'], {'applicationFilesMatched':len(pre['sourceFiles']),'secretsAndDependenciesExcluded':True}))
check('Executed release checks and native types pass; approved hosted API is ready', lambda: equal(
    [pre['preflightTests'],load('docs/ios-testflight-refresh-20261125/api-status.json')],
    [{'passed':10,'failed':0,'skipped':0,'nativeTypecheck':'PASS'},{'status':'ready','scope':'demo'}]))
if '--final' in sys.argv:
    artifact=load('docs/ios-testflight-refresh-20261125/artifact-verification.json')
    icon=load('docs/ios-testflight-refresh-20261125/icon-verification.json')
    store=load('docs/ios-testflight-refresh-20261125/submission.json')
    apple=load('docs/ios-testflight-refresh-20261125/apple-status.json')
    check('Exact signed archive identity, source commit and all eight archive checks match',lambda: equal(
        [artifact['buildId'],artifact['buildNumber'],artifact['packagingCommit'],len(artifact['checks']),all(x['status']=='PASS' for x in artifact['checks'])],
        [pre['buildId'],pre['buildNumber'],pre['packagingCommit'],8,True]))
    check('Packaged approved iPhone/iPad icons verified',lambda: equal([icon['status'],len(icon['icons'])>=2],['PASS',True]))
    check('Exact EAS submission finished and Apple accepted the new build',lambda: equal(
        [store['status'],store['buildId'],apple['build']['easBuildId'],apple['build']['buildNumber'],apple['build']['processingState'],apple['build']['internalState']],
        ['FINISHED',pre['buildId'],pre['buildId'],pre['buildNumber'],'VALID','IN_BETA_TESTING']))
    check('Same two approved internal testers, no access expansion and saved test notes',lambda: equal(
        [store['groupId'],store['internalTesters'],store['testerIdsUnchanged'],store['automaticFutureBuildAccessChanged'],store['testNotesSaved']],
        ['2ee5b345-71af-4aa0-85d4-816ce27dbb58',2,True,False,True]))
    r=load('docs/traceability/store-testing-20261123-rtm.json')
    check('Six stable requirements/gates, historical Android and all original holds retained',lambda: equal(
        [len(r['requirements']),len(r['gates']),r['coverage']['verified'],r['coverage']['excluded'],r['iosRefresh20261125']['androidChanged'],'NO-GO' in r['productionDecision']],
        [6,6,6,0,False,True]))
print(f'ℹ tests {count}\nℹ pass {count}\nℹ fail 0\nℹ skipped 0')
print('Exact release evidence only; no installed-device acceptance inferred.')
