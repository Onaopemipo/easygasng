import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const root='docs/admin-order-modal/evidence';
const checks=JSON.parse(await readFile(root+'/browser-checks.json','utf8'));
test('AORD-BROWSER: saved desktop/phone observations show a compact summary, one workflow dialog, bounded dimensions and retained interactions',async()=>{
 for(const name of ['delivered-desktop','delivered-mobile','delivered-dark-mobile','invoice-desktop','status-mobile','additions-desktop','consent-desktop']){
  const r=checks.observations.find((r:any)=>r.name===name);assert.ok(r,name);assert.equal(r.dialogs,1);assert.equal(r.width,r.pageWidth);assert.ok(r.dialogWidth<=r.width);assert.ok(r.dialogRight<=r.width);assert.ok(r.dialogHeight<r.viewportHeight);await access(`${root}/${name}.jpg`);await access(`${root}/${name}.ax.txt`);
  if(name.startsWith('delivered')){assert.equal(r.forms,0);assert.equal(r.buttons,5);assert.ok(r.dialogHeight<500);assert.doesNotMatch(r.text,/Add items|More actions|consent|invitation|coverage before dispatch/);}
 }
 for(const name of ['payment','history','draft','additions','assignment','communication','keyboard-dark','phone-draft','items'])assert.match(checks.interactions.find((r:any)=>r.name===name)?.result??'',/^PASS:/,name);
});
