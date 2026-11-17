import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync,mkdirSync,copyFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalPlatform } from '../local-platform';

test('local: persistência de leads, CMS privado, publicação e estados de cidade',async()=>{
 const root=mkdtempSync(join(tmpdir(),'showbrinq-test-'));mkdirSync(join(root,'server'));copyFileSync(join(process.cwd(),'server/seed-history.json'),join(root,'server/seed-history.json'));
 const platform=createLocalPlatform(root),app=express();app.use(express.json());app.use('/api',platform.router);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}`;
 const request=(path:string,method='GET',body?:unknown,token?:string,origin=base)=>fetch(base+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(token?{'x-local-token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 try{
  assert.equal((await request('/local-admin/data')).status,403);
  const token=(await (await request('/local-admin/session')).json()).token;
  const lead={company:'Empresa de teste',name:'Contato de teste',email:'teste@example.test',phone:'11999999999',segment:'Fabricante',cities:['caruaru'],consent:true,website:''};
  assert.equal((await request('/exhibitor-leads','POST',lead,undefined,'https://outro.example')).status,403);
  assert.equal((await request('/exhibitor-leads','POST',{...lead,cities:['inexistente']})).status,400);
  assert.equal((await request('/exhibitor-leads','POST',{...lead,consent:false})).status,400);
  assert.equal((await request('/exhibitor-leads','POST',{...lead,model:'modelo-5'})).status,400);
  assert.equal((await request('/exhibitor-leads','POST',{...lead,cities:['caruaru','caruaru']})).status,400);
  assert.equal((await request('/exhibitor-leads','POST',{...lead,phone:'telefone desconhecido'})).status,400);
  assert.equal((await request('/exhibitor-leads','POST',{...lead,message:'a'.repeat(1201)})).status,400);
  assert.equal((await request('/exhibitor-leads','POST',{...lead,source:'untrusted-origin'})).status,400);

  const response=await request('/exhibitor-leads','POST',lead);assert.equal(response.status,201);assert((await response.json()).id);
  assert.equal((await (await request('/local-admin/data','GET',undefined,token)).json()).leads.length,1);
  const detailedLead={...lead,company:'=SOMA(1;2)',name:'Contato "Comercial"',phone:'+55 (11) 99999-9999',cities:['caruaru','piracicaba'],model:'modelo-2',message:'  @mensagem; com "aspas"\nsegunda linha  ',source:'stands-page'};
  const detailedResponse=await request('/exhibitor-leads','POST',detailedLead);assert.equal(detailedResponse.status,201);
  const detailedId=(await detailedResponse.json()).id;
  const allLeads=(await (await request('/local-admin/data','GET',undefined,token)).json()).leads;assert.equal(allLeads.length,2);
  assert.equal(allLeads[1].message,'@mensagem; com "aspas"\nsegunda linha');assert.equal(allLeads[1].source,'stands-page');
  assert.equal((await request('/local-admin/leads.csv')).status,403);
  assert.equal((await request('/local-admin/leads.csv','GET',undefined,'invalid-token')).status,403);
  const csvResponse=await request('/local-admin/leads.csv','GET',undefined,token);assert.equal(csvResponse.status,200);
  assert.match(csvResponse.headers.get('content-type')||'',/^text\/csv; charset=utf-8/i);assert.match(csvResponse.headers.get('content-disposition')||'',/attachment; filename="showbrinq-expositores.csv"/);
  const csvBytes=new Uint8Array(await csvResponse.arrayBuffer());assert.deepEqual([...csvBytes.slice(0,3)],[239,187,191]);
  const csv=Buffer.from(csvBytes).toString('utf8');
  assert(csv.includes('"ID";"Data";"Empresa"'));assert(csv.includes(detailedId));
  assert(csv.includes('"\'=SOMA(1;2)"'));assert(csv.includes('"Contato ""Comercial"""'));
  assert(csv.includes('"\'+55 (11) 99999-9999"'));assert(csv.includes('"Caruaru | Piracicaba"'));
  assert(csv.includes('"Modelo 2"'));assert(csv.includes('"\'@mensagem; com ""aspas""\nsegunda linha"'));assert(csv.includes('"stands-page";"Sim"'));
  assert.equal((await (await request('/local-admin/data','GET',undefined,token)).json()).leads.length,2);

  assert.equal((await request('/local-admin/registration/caruaru','PUT',{status:'open',url:''},token)).status,400);
  assert.equal((await request('/local-admin/registration/caruaru','PUT',{status:'open',url:'https://example.test/cadastro'},token)).status,200);
  assert.equal((await request('/local-admin/registration/caruaru','PUT',{status:'closed',url:''},token)).status,200);
  const draft={title:'Artigo somente de teste',slug:'artigo-teste',excerpt:'Resumo de artigo somente de teste.',category:'Varejo',author:'Equipe de teste',sources:'',bodyHtml:'<p>Conteúdo de teste.</p><script>alert(1)</script>',status:'draft',seoTitle:'Título de teste',seoDescription:'Descrição de teste.'};
  const saved=await (await request('/local-admin/posts','POST',draft,token)).json();assert(saved.post);assert(!saved.post.bodyHtml.includes('<script>'));
  assert.equal((await request('/blog/posts/artigo-teste')).status,404);
  assert.equal((await request('/local-admin/posts','POST',{...draft,id:saved.post.id,revision:0},token)).status,409);
  assert.equal((await request('/local-admin/posts','POST',{...draft,coverUrl:'https://example.test/image.jpg'},token)).status,400);
  const publish={...draft,id:saved.post.id,revision:saved.post.revision,status:'published',coverUrl:'/assets/drive-selection/produtos.jpg'};
  assert.equal((await request('/local-admin/posts','POST',publish,token)).status,400);
  assert.equal((await request('/local-admin/posts','POST',{...publish,coverAlt:'   '},token)).status,400);
  const published=await (await request('/local-admin/posts','POST',{...publish,coverAlt:'Brinquedos de faz de conta no acervo da feira'},token)).json();assert(published.post);
  const edited=await (await request('/local-admin/posts','POST',{...draft,id:published.post.id,revision:published.post.revision,status:'published'},token)).json();
  assert.equal(edited.post.coverUrl,publish.coverUrl);assert.equal(edited.post.coverAlt,published.post.coverAlt);

  assert.equal((await request('/blog/posts/artigo-teste')).status,200);
  assert(createLocalPlatform(root).find('artigo-teste'));
 }finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));rmSync(root,{recursive:true,force:true});}
});
