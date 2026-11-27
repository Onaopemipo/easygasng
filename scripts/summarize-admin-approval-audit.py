import json
from pathlib import Path
p=Path('docs/admin-single-approval/hosted-audit')
reports=['base.json','doorstep-initial.json','settings.json','base-final.json','bulk.json','service-final.json','normal-candidate-final.json','base-stocktake-final.json','settings-recheck-final.json','service-fresh-quote.json','service-cash-candidate-v3.json','service-recovery-final.json','supplemental-initial.json','security-final.json','manifest-protected-qa-final.json','doorstep-final.json']
latest={};history={}
for filename in reports:
 r=json.loads((p/filename).read_text())
 for c in r['cases']:
  history.setdefault(c['id'],[]).append({'report':filename,**c})
  latest[c['id']]={'report':filename,'deploymentUrl':r.get('base','https://easygas-client-demo.vercel.app'),**c}
assert len(latest)==117,(len(latest),list(latest))
assert all(c['status']=='PASS' for c in latest.values()),[c for c in latest.values() if c['status']!='PASS']
qa={'ADM-H25-manifest-discrepancy-own-admin','ADM-H40-doorstep-gas-cash-one-admin','ADM-H41-doorstep-products-cash-one-admin'}
for id,c in latest.items():
 c['environment']='Temporary authenticated QA deployment; stable feature remains disabled' if id in qa else 'Normal demo release / same-source candidate'
 c['priorFailures']=[x for x in history[id] if x['status']!='PASS']
result={'status':'PASS','scope':'Admin business authorisation; genuine evidence, customer consent and self-privilege/technical-qualification restrictions remain','total':117,'passed':117,'failed':0,'excluded':0,'normalReleaseOrCandidateChecks':114,'temporaryQaChecks':3,'settingChecks':76,'mutableSettings':70,'lockedSettings':6,'workflowChecks':41,'activationLimit':'All 70 mutable original settings exercised through scheduled approval and cancellation; sensitive/global settings were not activated. Domain activation separately exercised by workflow cases.','stableDoorstepEnabled':False,'noSecondBusinessApproverObserved':True,'historicalFailuresRetained':True,'cases':[latest[k] for k in sorted(latest)],'productionDecision':'NO-GO; prior import/native/provider/retention and other holds retained'}
result['releaseLineage']={'initialDemo085':'dpl_Ccmz2843ctyDHaYJkTSsHZtAwjNT','normalFixV2':'dpl_HVSuDpUabm6TDXQRWRnhdpiFYu9P','currentNormalV3':'dpl_Fi7zpG1R5Ex39d1tFyQyFYqseLM4','manifestQaRemoved':'dpl_2whRpv2MSvPazat3GBUdYAD3t6Zk','doorstepQaRemoved':'dpl_GEERQfqwF3qZi85NSm2o46k2ZGh1'}
result['releaseEvidenceLimit']='Checks span the verified demo085 release lineage. Every discovered defect was rechecked after its fix. The shared approval policy and unchanged handlers carry into the latest release; this is not a claim that every historical check reran after each copy-only change.'
result['canonicalAuthorisationProof']='canonical-authority.json'
(p/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS 117 retained checks: 114 normal release/candidate and 3 temporary QA checks')
