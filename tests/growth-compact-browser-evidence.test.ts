import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const root='docs/growth-compact/evidence';
const evidence=JSON.parse(await readFile(`${root}/browser-checks.json`,'utf8'));
for(const [index,route] of ['campaigns','recommendations','testimonials'].entries())test(`GROW-UI${String(index+1).padStart(2,'0')}: ${route} desktop and phone keep eight rows, no default form/dialog and no page overflow`,async()=>{
 const records=evidence.observations.filter((r:any)=>r.route===route);assert.equal(records.length,2);
 for(const r of records){assert.equal(r.width,r.label==='desktop'?1440:390);assert.equal(r.pageWidth,r.width);assert.equal(r.rows,8);assert.equal(r.forms,0);assert.equal(r.dialogs,0);assert.ok(r.workspaceHeight<=1100);await access(`${root}/${route}-${r.label}.jpg`);await access(`${root}/${route}-${r.label}.ax.txt`);}
});
test('GROW-INTERACT: dialogs fit the phone viewport and preserve filters, original feedback, draft guards and full filtered exports',async()=>{
 for(const name of ['campaign-draft','campaign-detail','campaign-rewards','campaign-empty','recommendation-proposal','recommendation-review','recommendation-performance','recommendation-filter','testimonial-history','testimonial-draft','testimonial-pagination','testimonial-export','testimonial-selection','testimonial-empty','testimonial-analytics','keyboard','dark'])assert.match(evidence.interactions.find((r:any)=>r.name===name)?.result??'',/^PASS:/);
 for(const d of evidence.dialogs){assert.ok(d.right<=d.viewportWidth);assert.ok(d.width<d.viewportWidth);assert.ok(d.height<d.viewportHeight);}
 assert.equal(evidence.dialogs.find((d:any)=>d.name==='feedback-filters').statusOptions,9);
 assert.equal((await readFile(`${root}/testimonials-export.csv`,'utf8')).trim().split(/\r?\n/).length,11);
});
