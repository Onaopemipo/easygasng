import assert from'node:assert/strict';
const base='https://easygas-client-demo.vercel.app';
const response=await fetch(base);assert.equal(response.status,200);const html=await response.text();
const assets=[...new Set([...html.matchAll(/href="([^\"]+\.css(?:\?[^\"]*)?)"/g)].map(x=>x[1]))];assert.ok(assets.length);
let css='';for(const asset of assets){const r=await fetch(new URL(asset,base));assert.equal(r.status,200);css+=await r.text();}
for(const token of ['eg-loader__orbit','--loader-track','--loader-orange','prefers-reduced-motion'])assert.ok(css.includes(token),'Missing deployed loader token '+token);
assert.match(html,/Client demo/);console.log('PASS stable demo homepage200, branded loader CSS/motion/theme tokens present, demo notice retained');
