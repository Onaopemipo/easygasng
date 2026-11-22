import {reviewedNativeEdgeVisualSourceHash} from './reviewed-native-edge-visual-source.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const nativeEdgeFiles=['App','AppAlert','ContextSheet','DriverAssignmentAlerts','DriverSignIn','DriverWorkspace','Onboarding','TechnicianSignIn','TechnicianWorkspace','TechniciansManagement'].map(n=>'apps/mobile/'+n+'.tsx').sort();
export async function reviewedNativeEdgeSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/edge-to-edge/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),nativeEdgeFiles);
 if(!review.files[file])return reviewedNativeEdgeVisualSourceHash(file,incoming);
 assert.equal(incoming,review.baseline[file],file+' native edge historical baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file])).digest('hex'),incoming,file+' retained committed source');
 return reviewedNativeEdgeVisualSourceHash(file,review.files[file]);
}
