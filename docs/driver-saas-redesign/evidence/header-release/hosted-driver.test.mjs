import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.EASYGAS_QA_PLAYWRIGHT_MODULE).href);
test('DRVS-DEMO: authenticated driver four-view layout and sandbox on stable synthetic demo',async()=>{
 const base='https://easygas-client-demo.vercel.app';
 const {accounts}=JSON.parse(await readFile(process.env.EASYGAS_DEMO_ACCOUNTS_FILE));
 const a=accounts.find(a=>a.role==='driver'); assert.ok(a);
 const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext();
 const dir='docs/driver-saas-redesign/evidence/header-release';await mkdir(dir,{recursive:true});
 async function api(action,data){return context.request.fetch(base+'/api/'+action,{method:data?'POST':'GET',headers:{Origin:base},...(data?{data}:{})});}
 try{
  assert.deepEqual(await (await api('status')).json(),{status:'ready',scope:'demo'});
  assert.equal((await api('login',{identifier:a.email,password:a.password})).status(),200);
  assert.equal((await (await api('payments/paystack/configuration')).json()).environment,'test');
  const s=await api('driver.snapshot');assert.equal(s.status(),200);assert.ok((await s.json()).profile.id);
  const page=await context.newPage();page.setDefaultTimeout(30000);
  await page.goto(base+'/admin/deliveries',{waitUntil:'domcontentloaded'});
  const nav=page.getByRole('navigation',{name:'Driver workspace'}),root=nav.locator('..');
  await root.getByRole('heading',{name:/Good to see you/}).waitFor();
  for(const width of [320,390,768,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   for(const tab of ['Home','Orders','History','Profile']){
    await nav.getByRole('button',{name:tab,exact:true}).click();
    if(tab==='History')await root.getByText(/completed deliveries in this period/).waitFor();
    assert.equal(await nav.getByRole('button',{name:tab,exact:true}).getAttribute('aria-pressed'),'true');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    assert.ok(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    if(width===390||width===1440)await page.screenshot({path:dir+`/demo-${width}-${tab.toLowerCase()}.png`,fullPage:true});
   }
   console.log(`PASS stable demo ${width}px: Home/Orders/History/Profile with no document or workspace horizontal overflow.`);
  }
  console.log('PASS existing authenticated driver scope and Paystack test configuration; no order, stock, availability, payment or profile mutations.');
 }finally{await api('logout',{});await browser.close();}
});
