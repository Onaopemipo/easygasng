// Reproducible coverage inventory: guard call sites, their enclosing action conditions,
// and all browser request transports. Guard-site coverage is not business-workflow acceptance.
import ts from 'typescript';
import fs from 'node:fs/promises';
import path from 'node:path';
const files = async dir => (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();
const guards=[];const entrypoints=[];const directFetch=[];
for(const file of await files('apps/web')) {
 if(!/\.(ts|tsx)$/.test(file)||file.includes('/.next'))continue;
 const text=await fs.readFile(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const line=n=>source.getLineAndCharacterOfPosition(n.getStart(source)).line+1;
 const strings=n=>{const result=[];const visit=x=>{if(ts.isStringLiteral(x))result.push(x.text);ts.forEachChild(x,visit);};visit(n);return [...new Set(result)];};
 function visit(n){
  if(file.includes('/lib/')&&ts.isCallExpression(n)&&n.expression.getText(source)==='recentVerification'){
   let p=n.parent,fn,conditions=[];
   while(p){if(ts.isIfStatement(p))conditions.push(p.expression.getText(source));if(ts.isFunctionLike(p)){fn=p;break;}p=p.parent;}
   guards.push({id:`SVERIFY-SITE-${String(guards.length+1).padStart(3,'0')}`,file,line:line(n),function:fn?.name?.getText(source)??'anonymous',conditions,actionCandidates:strings(fn??n).filter(s=>/^[a-z]+[a-z.-]*\.[a-z.-]+$/.test(s))});
  }
  if(file.includes('/components/')&&ts.isCallExpression(n)&&['api','fetch','pay'].includes(n.expression.getText(source))){
   const item={file,line:line(n),transport:n.expression.getText(source),target:n.arguments[0]?.getText(source),literal:ts.isStringLiteral(n.arguments[0])?n.arguments[0].text:null};
   if(item.transport==='fetch')directFetch.push(item);else entrypoints.push(item);
  }
  if(file.includes('/components/')&&ts.isJsxAttribute(n)&&n.name.getText(source)==='action'&&n.initializer&&ts.isStringLiteral(n.initializer))entrypoints.push({file,line:line(n),transport:'form action',target:n.initializer.text,literal:n.initializer.text});
  ts.forEachChild(n,visit);
 }visit(source);
}
// Preserve existing site identities when another module adds a guard. Source
// order and line moves must not renumber previously traced controls.
let prior=[];
try{prior=JSON.parse(await fs.readFile('docs/sensitive-action-verification/inventory.json','utf8')).guardSites;}catch(e){if(e.code!=='ENOENT')throw e;}
const signature=g=>JSON.stringify([g.file,g.function,g.conditions]);
const retained=new Map();let lastId=0;
for(const g of prior){const key=signature(g),ids=retained.get(key)??[];ids.push(g.id);retained.set(key,ids);lastId=Math.max(lastId,Number(g.id.split('-').at(-1)));}
guards.sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line).forEach(g=>{g.id=retained.get(signature(g))?.shift()??`SVERIFY-SITE-${String(++lastId).padStart(3,'0')}`;});
const inventory={scope:'All server recentVerification call sites and browser transports; indirect policy/privilege callers retained in guard-site denominator. Workflow business acceptance is separate.',guardSites:guards.map(g=>({...g,recovery:'shared api -> explicit password dialog -> same-session, exact-body, one retry; existing inline fields retained'})),browserEntryPoints:entrypoints,directFetch,summary:{guardSites:guards.length,guardFiles:new Set(guards.map(g=>g.file)).size,browserCalls:entrypoints.length,directFetch:directFetch.length},notes:['Direct fetch: shared API transport, workspace/search/export reads, media uploads and hosted-payment transport. None invokes recentVerification outside shared /api/[action] dispatch.','Conditional governance, delegated privilege and recovery helper guards remain in scope; actionCandidates are context literals, not a count of accepted business operations.','No server role, branch, qualification, provider, approval or verification-expiry rule removed.']};
await fs.writeFile('docs/sensitive-action-verification/inventory.json',JSON.stringify(inventory,null,2)+'\n');
console.log(JSON.stringify(inventory.summary));
