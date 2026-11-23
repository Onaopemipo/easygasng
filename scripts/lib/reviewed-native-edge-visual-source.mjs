import {reviewedNativeUxSourceHash} from './reviewed-native-ux-source.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function reviewedNativeEdgeVisualSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/edge-to-edge/visual-acceptance/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/mobile/App.tsx','apps/mobile/AppAlert.tsx','apps/mobile/FleetLocations.tsx','apps/mobile/ScreenCanvas.tsx']);
 if(!review.files[file])return reviewedNativeUxSourceHash(file,incoming);
 assert.equal(incoming,review.baseline[file],file+' native visual historical baseline');
 if(file!=='apps/mobile/FleetLocations.tsx'){
  const prior=JSON.parse(await readFile('docs/edge-to-edge/reviewed-source-changes.json','utf8'));
  assert.equal(incoming,(prior.files[file]??prior.newFiles[file]),file+' retained edge canvas proof');
 }else assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file])).digest('hex'),incoming,file+' retained committed source');
 return reviewedNativeUxSourceHash(file,review.files[file]);
}
