import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import WorkspaceLink,{WorkspaceAccess,workspaceLinkVisible} from '../apps/web/components/workspace-link';
import {fixture} from './helpers/order-tracking-fixture';
import {navigationAccess} from '../apps/web/lib/navigation';
test('MENU-01: workspace links hide denied menus and preserve public links',()=>{
 const render=(allowed: string[]|null,href:string)=>renderToStaticMarkup(React.createElement(WorkspaceAccess.Provider,{value:allowed},React.createElement(WorkspaceLink,{href},'Menu')));
 assert.equal(render(['deliveries'],'/admin/staff'),'');
 assert.equal(render([],'/admin'),'');
 assert.match(render(['deliveries'],'/admin/deliveries?view=active'),/Menu/);
 assert.match(render([],'/help'),/Menu/);
 assert.match(render(null,'/admin/staff'),/Menu/);
 assert.equal(workspaceLinkVisible('/administer',[]),true);
 assert.equal(workspaceLinkVisible('/admin/inventory#stock',['orders']),false);
});
test('MENU-02: role and revoked privileges filter menus without granting backend authority',async()=>{
 const f=await fixture();try{
  for(const role of ['owner','driver','inventory','dispatcher']) {
   const access=await f.call(role,'navigation.access');
   for(const route of ['orders','staff','inventory','finance','deliveries']) assert.equal(workspaceLinkVisible('/admin/'+route,access.allowed),access.allowed.includes(route));
  }
  const actor:any={id:f.actors.inventory.id,name:'Inventory',role:'finance',branch_id:'lagos',privilege_overrides:{'inventory.view':'deny'}};
  const access=await navigationAccess(f.db,actor);assert.ok(!access.allowed.includes('inventory'));
  await assert.rejects(()=>f.call('driver','staff.privileges'),(error:any)=>error.status===403);
 }finally{await f.db.close?.();}
});
