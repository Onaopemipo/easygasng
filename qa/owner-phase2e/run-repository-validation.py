#!/usr/bin/env python3
"""Run Phase 2E validation in an isolated EasyGas checkout, never against production.
Writes evidence outside source by default; no deployment or database migrations.
"""
from pathlib import Path
import argparse, os, subprocess, json, datetime
p=argparse.ArgumentParser()
p.add_argument('repo',help='Path to existing EasyGas checkout')
p.add_argument('--evidence',help='Evidence directory (default: <repo>/docs/owner-phase2e/evidence)')
p.add_argument('--full-tests',action='store_true',help='Run npm test; use isolated test database and fixtures only')
a=p.parse_args()
repo=Path(a.repo).resolve()
if not (repo/'AGENTS.md').exists() or not (repo/'apps/mobile/App.tsx').exists():
    raise SystemExit('Not an EasyGas repository checkout.')
evidence=Path(a.evidence).resolve() if a.evidence else repo/'docs/owner-phase2e/evidence'
evidence.mkdir(parents=True,exist_ok=True)
checks=[('web-typecheck',['npm','run','typecheck'],repo),('web-build',['npm','run','build'],repo),('native-typecheck',['npx','tsc','--noEmit','-p','tsconfig.json'],repo/'apps/mobile')]
if a.full_tests: checks.append(('full-regression',['npm','test'],repo))
results=[]
for name,cmd,cwd in checks:
    if not cwd.exists() or not (cwd/'package.json').exists() and name=='native-typecheck':
        results.append({'name':name,'result':'BLOCKED','reason':'Missing workspace'});continue
    try:
        proc=subprocess.run(cmd,cwd=cwd,env=os.environ.copy(),capture_output=True,text=True,timeout=1800)
        (evidence/f'{name}.txt').write_text('COMMAND: '+' '.join(cmd)+'\nEXIT: '+str(proc.returncode)+'\n\nSTDOUT\n'+proc.stdout+'\nSTDERR\n'+proc.stderr)
        results.append({'name':name,'result':'PASS' if proc.returncode==0 else 'FAIL','exit':proc.returncode,'evidence':str(evidence/f'{name}.txt')})
    except (OSError,subprocess.TimeoutExpired) as exc:
        results.append({'name':name,'result':'BLOCKED','reason':str(exc)})
result={'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':None,'tests':results,'native_device_acceptance':'NOT_RUN','production_go':'NO-GO'}
try:
    result['commit']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
except Exception: pass
(evidence/'summary.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
raise SystemExit(1 if any(r['result']!='PASS' for r in results) else 0)
