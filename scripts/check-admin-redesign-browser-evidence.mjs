// Validates saved hosted-browser observations; does not replace the actual browser run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const root='docs/deployment/evidence/20261119-admin-redesign';
const evidence=JSON.parse(await readFile(root+'/browser-checks.json','utf8'));
test('ARDREL-BROWSER: eleven deployed workspaces fit desktop and phone, retain main interactions and export the complete filtered result',async()=>{
 const routes=['support','bookings','services','quotations','finance','reconciliation','credits','reports','campaigns','recommendations','testimonials'];
 assert.equal(evidence.observations.length,22);
 for(const route of routes){
  const rows=evidence.observations.filter(r=>r.route===route);assert.equal(rows.length,2,route);
  assert.deepEqual(rows.map(r=>r.label).sort(),['desktop','mobile']);
  for(const r of rows){assert.ok(r.heading);assert.equal(r.width,r.label==='desktop'?1440:390);assert.equal(r.pageWidth,r.width);assert.equal(r.dialogs,0);assert.ok(r.rows<=8);await access(`${root}/${route}-${r.label}.jpg`);await access(`${root}/${route}-${r.label}.ax.txt`);}
  assert.match(evidence.interactions.find(r=>r.name===route)?.result??'',/^PASS:/,route+' interaction');
 }
 for(const name of ['phone-modal','dark','fallback-report'])assert.match(evidence.interactions.find(r=>r.name===name)?.result??'',/^PASS:/);
 const csv=await readFile(root+'/stock-movements-export.csv','utf8');assert.equal(csv.trim().split(/\r?\n/).length,18);
 const layouts=JSON.parse(await readFile(root+'/document-cell-layout.json','utf8'));assert.equal(layouts.length,2);
 for(const layout of layouts){assert.equal(layout.pageWidth,layout.width);assert.equal(layout.referenceCells.length,8);for(const cell of layout.referenceCells){assert.ok(cell.overflow<=1);assert.equal(cell.whiteSpace,'normal');}}
 assert.match(evidence.interactions.find(r=>r.name==='document-wrapping')?.result??'',/^PASS:/);
});
