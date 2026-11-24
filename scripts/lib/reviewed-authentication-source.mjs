import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex');
const original=['apps/mobile/App.tsx','apps/mobile/DriverSignIn.tsx','apps/mobile/NativeEntry.tsx','apps/mobile/ScreenTransition.tsx','apps/mobile/TechnicianSignIn.tsx','apps/mobile/typography.tsx','apps/web/app/layout.tsx','apps/web/components/phone-completion.tsx','apps/web/components/site.tsx','apps/web/components/workflows.tsx'];
const added=['apps/mobile/AuthPresentation.tsx','apps/mobile/AuthRecovery.tsx','apps/web/app/auth.css','apps/web/components/auth-link-entry.tsx','apps/web/components/auth-presentation.tsx','apps/web/components/auth-recovery-request.tsx','apps/web/components/auth-request.ts','packages/business-rules/src/auth-request.ts'];
async function review(){const r=JSON.parse(await readFile('docs/auth-redesign/reviewed-source-changes.json','utf8'));assert.deepEqual(Object.keys(r.files).sort(),original);assert.deepEqual(Object.keys(r.additions).sort(),added);return r;}
/** Only a known, committed frontend transition is accepted. Earlier proof bytes remain intact. */
export async function reviewedAuthenticationSourceHash(file,incoming){
 const r=await review();if(!r.files[file])return incoming;
 assert.equal(incoming,r.baseline[file],file+' authentication historical baseline');
 assert.equal(digest(execFileSync('git',['show',r.baseCommit+':'+file],{maxBuffer:32*1024*1024})),incoming,file+' committed pre-authentication source');
 assert.equal(digest(await readFile(file)),r.files[file],file+' reviewed authentication current source');
 return r.files[file];
}
/** Retains a historical no-native-change assertion, then validates the later approved exact scope. */
export async function assertReviewedAuthenticationNativeScope(historicalBase){
 const r=await review();
 assert.equal(execFileSync('git',['diff',historicalBase,r.baseCommit,'--','apps/mobile'],{encoding:'utf8'}),'','historical native preservation before authentication');
 const diff=execFileSync('git',['diff','--name-only',r.baseCommit,'--','apps/mobile'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const untracked=execFileSync('git',['ls-files','--others','--exclude-standard','apps/mobile'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const expected=[...Object.keys(r.files),...Object.keys(r.additions)].filter(f=>f.startsWith('apps/mobile/')).sort();
 assert.deepEqual([...new Set([...diff,...untracked])].sort(),expected,'only approved native auth files may change');
 for(const f of expected)assert.equal(digest(await readFile(f)),r.files[f]??r.additions[f],f+' native authentication exact bytes');
}
