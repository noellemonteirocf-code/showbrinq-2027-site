import express, { Router, type Request } from 'express';
import { saveVisualMedia } from './local-visual-media';
import { buyerVisualDefault } from '../shared/buyer-visual';
import { mkdirSync, readFileSync, existsSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { editions } from '../src/data';
import type { BlogPost } from '../shared/cms';

const localCoverPaths = ['/assets/fundadores-showbrinq.png','/assets/origem-showbrinq.png','/assets/drive-selection/produtos.jpg','/assets/drive-selection/ambiente.jpg','/assets/editorial/lojistas-plaspolo.jpg','/assets/editorial/fornecedores-tilin.jpg','/assets/acervo-2026/registro-01.jpg','/assets/acervo-2026/registro-02.jpg','/assets/acervo-2026/registro-03.jpg','/assets/acervo-2026/registro-04.jpg','/assets/acervo-2026/registro-05.jpg','/assets/acervo-2026/registro-06.jpg','/assets/acervo-2026/registro-07.jpg','/assets/acervo-2026/registro-08.jpg','/assets/acervo-2026/registro-09.jpg'] as const;

function csvCell(value:unknown){
 const raw=value===null||value===undefined?'':String(value);
 const text=/^[\s\uFEFF]*[=+\-@]/u.test(raw)?"'"+raw:raw;
 return '"'+text.replace(/"/g,'""')+'"';
}
function leadsCsv(leads:Record<string,unknown>[]){
 const header=['ID','Data','Empresa','Nome','E-mail','Telefone','Segmento','Cidades','Modelo','Mensagem','Origem','Consentimento'];
 const rows=leads.map(lead=>[
  lead.id,lead.createdAt,lead.company,lead.name,lead.email,lead.phone,lead.segment,
  Array.isArray(lead.cities)?lead.cities.map(id=>editions.find(e=>e.id===id)?.city||String(id)).join(' | '):'',
  /^modelo-[1-4]$/.test(String(lead.model||''))?'Modelo '+String(lead.model).slice(-1):lead.model,
  lead.message,lead.source,lead.consent===true?'Sim':'Não informado',
 ]);
 return '\uFEFF'+[header,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
}

type Registration = {city:string;status:'soon'|'open'|'closed';url:string};
type Store = {posts:BlogPost[];leads:Record<string,unknown>[];events:Record<string,unknown>[];registration:Registration[]};
export function createLocalPlatform(root:string) {
 const dir=join(root,'.local-platform'), file=join(dir,'data.json');
 mkdirSync(dir,{recursive:true,mode:0o700});
 const seed=JSON.parse(readFileSync(join(root,'server/seed-history.json'),'utf8'));
 let store:Store=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{posts:[{...seed,id:1,status:'published',revision:1,createdAt:seed.publishedAt,updatedAt:seed.publishedAt,author:'SHOWBRINQ',sources:'https://www.instagram.com/reel/C8ExuH6Os5Z/'}],leads:[],events:[],registration:editions.map(e=>({city:e.id,status:'soon',url:''}))};
 const marketPath=join(root,'server/seed-market.json');
 if(existsSync(marketPath)){const market=JSON.parse(readFileSync(marketPath,'utf8'));if(!store.posts.some(p=>p.slug===market.slug)){const now=new Date().toISOString();store.posts.push({...market,id:Math.max(0,...store.posts.map(p=>p.id))+1,status:'published',revision:1,createdAt:now,updatedAt:now,publishedAt:now});}}
 // Nomes confirmados pelo briefing da organização; preserva o restante do artigo.
 const history=store.posts.find(p=>p.slug==='historia-showbrinq');
 if(history&&!history.bodyHtml.includes('Seu Manoel')){history.bodyHtml='<p>Seu Manoel e Dona Eline são os fundadores da Showbrinq. A iniciativa nasceu da experiência de representação comercial e da necessidade de reunir os produtos em um showroom.</p>'+history.bodyHtml;history.updatedAt=new Date().toISOString();history.revision++;}
 // Atualiza somente as capas antigas de exemplo nos artigos iniciais.
 for(const post of store.posts){const cover=post.slug==='historia-showbrinq'?{url:'/assets/origem-showbrinq.png',alt:'Seu Manoel e Dona Eline em fotografia do início da Showbrinq'}:post.slug==='brinquedos-criancas-adultos-mercado-2025'?{url:'/assets/drive-selection/produtos.jpg',alt:'Brinquedos de faz de conta em exposição no acervo da Showbrinq'}:null;if(cover&&post.coverUrl==='/assets/event-photo-01.webp'){post.coverUrl=cover.url;post.coverAlt=cover.alt;post.revision++;}}
 const marketEditorial=store.posts.find(p=>p.slug==='brinquedos-criancas-adultos-mercado-2025');
 if(marketEditorial&&!marketEditorial.bodyHtml.includes('Colecionáveis e licenciamento ampliam')){marketEditorial.bodyHtml+="<h2>Colecionáveis e licenciamento ampliam a conversa sobre o mix.</h2><p>Segundo a Circana, as vendas em valor de colecionáveis cresceram 32% em 2025 no mercado global acompanhado. Os brinquedos licenciados representaram 37% das vendas desse mercado. Esses recortes internacionais não medem a participação dessas linhas no Brasil nem projetam resultados para 2027.</p><p>Para o lojista, vale perguntar quais públicos cada linha atende e como ela se encaixa no mix. Para o fornecedor, a apresentação pode esclarecer diferenças entre coleções, faixas de preço e reposição. Esses dados ajudam a formular perguntas; a decisão comercial depende da realidade de cada empresa.</p>";marketEditorial.updatedAt=new Date().toISOString();marketEditorial.revision++;}
 const save=()=>{writeFileSync(file+'.tmp',JSON.stringify(store,null,2),{mode:0o600});renameSync(file+'.tmp',file);};
 save();
 const token=randomBytes(32).toString('hex');
 const router=Router();
 const local=(req:Request)=>/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'') && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress||'');
 router.use((req,res,next)=>{if(!local(req)){res.status(403).json({error:'Disponível apenas neste computador.'});return;}if(!['GET','HEAD'].includes(req.method)){const origin=req.get('origin');if(!origin||origin!==`${req.protocol}://${req.get('host')}`){res.status(403).json({error:'Origem inválida.'});return;}}next();});
 const published=()=>store.posts.filter(p=>p.status==='published').sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));
 router.get('/health',(_req,res)=>res.json({status:'ready',mode:'local'}));
 router.get('/blog/posts',(_req,res)=>res.json({posts:published()}));
 router.get('/blog/posts/:slug',(req,res)=>{const post=published().find(p=>p.slug===req.params.slug);res.status(post?200:404).json(post?{post}:{error:'Artigo não encontrado.'});});
 router.get('/registration',(_req,res)=>res.json({cities:store.registration}));
 const windows=new Map<string,{time:number;count:number}>();
 router.post('/exhibitor-leads',(req,res)=>{
  const parsed=z.object({company:z.string().trim().min(2).max(160),name:z.string().trim().min(2).max(120),email:z.string().email().max(180),phone:z.string().trim().min(8).max(30).refine(v=>v.replace(/\D/g,'').length>=8),segment:z.enum(['Fabricante','Distribuidor','Representante']),cities:z.array(z.string()).min(1).max(6).refine(v=>v.every(c=>editions.some(e=>e.id===c))&&new Set(v).size===v.length),model:z.enum(['','modelo-1','modelo-2','modelo-3','modelo-4']).optional(),message:z.string().trim().max(1200).optional(),source:z.enum(['supplier-page','stands-page']).optional(),consent:z.literal(true),website:z.string().max(0).optional()}).safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'Confira empresa, contato, segmento, cidades e autorização de contato.'});return;}
  const key=req.socket.remoteAddress||'',now=Date.now(),w=windows.get(key);const current=w&&now-w.time<60000?w:{time:now,count:0};windows.set(key,current);if(++current.count>8){res.status(429).json({error:'Aguarde um minuto para tentar novamente.'});return;}
  const id=randomUUID();store.leads.push({...parsed.data,id,createdAt:new Date().toISOString()});store.events.push({event:'exhibitor_lead_saved',createdAt:new Date().toISOString()});save();res.status(201).json({id,storage:'local'});
 });
 router.post('/events',(req,res)=>{const p=z.object({event:z.enum(['exhibitor_cta','visitor_cta','registration_outbound','stand_interest']),city:z.string().max(40).optional()}).safeParse(req.body);if(!p.success){res.sendStatus(400);return;}if(store.events.length>10000)store.events=store.events.slice(-9000);store.events.push({...p.data,createdAt:new Date().toISOString()});save();res.sendStatus(204);});
 router.get('/local-admin/session',(_req,res)=>res.set('Cache-Control','no-store').json({token,mode:'local'}));
 router.use('/local-admin',(req,res,next)=>{if(req.get('x-local-token')!==token){res.sendStatus(403);return;}next();});

 const visualFile=join(dir,'buyer-visual.json');
 const readVisual=()=>existsSync(visualFile)?JSON.parse(readFileSync(visualFile,'utf8')):buyerVisualDefault;
 router.get('/site/lojistas',(_req,res)=>res.set('Cache-Control','no-store').json(readVisual()));
 router.get('/site-media/:name',(req,res)=>{if(!/^[a-f0-9-]+\.(png|jpg|webp|mp4)$/.test(req.params.name)){res.sendStatus(404);return;}res.sendFile(join(dir,'site-media',req.params.name));});
 const assetPath=z.string().max(500).refine(v=>/^\/(assets\/|api\/site-media\/)[a-zA-Z0-9_./-]+$/.test(v)&&!v.includes('..'));
 const visualSchema=z.object({revision:z.number().int().nonnegative(),heroPhoto:assetPath,heroAlt:z.string().trim().min(3).max(300),title:z.string().trim().min(5).max(180),intro:z.string().trim().min(10).max(600),clips:z.array(z.object({src:assetPath,poster:assetPath,title:z.string().trim().min(3).max(180),description:z.string().trim().min(5).max(500)})).min(1).max(6)});
 router.put('/local-admin/visual',(req,res)=>{const parsed=visualSchema.safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Confira os textos e selecione arquivos locais válidos.'});return;}const current=readVisual();if(current.revision!==parsed.data.revision){res.status(409).json({error:'O conteúdo mudou. Recarregue o painel antes de salvar.'});return;}const next={...parsed.data,revision:current.revision+1};writeFileSync(visualFile+'.tmp',JSON.stringify(next,null,2),{mode:0o600});renameSync(visualFile+'.tmp',visualFile);res.json(next);});
 router.post('/local-admin/visual-media',express.raw({type:['image/png','image/jpeg','image/webp','video/mp4','video/quicktime','video/x-m4v','application/octet-stream'],limit:'250mb'}),(req,res)=>void saveVisualMedia(req,res,dir));

 router.get('/local-admin/data',(_req,res)=>res.set('Cache-Control','no-store').json(store));
 router.get('/local-admin/leads.csv',(_req,res)=>res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="showbrinq-expositores.csv"','Cache-Control':'no-store'}).send(leadsCsv(store.leads)));
 router.put('/local-admin/registration/:city',(req,res)=>{const p=z.object({status:z.enum(['soon','open','closed']),url:z.string().max(1000)}).safeParse(req.body);if(!p.success||!store.registration.some(c=>c.city===req.params.city)){res.sendStatus(400);return;}if(p.data.status==='open'&&!/^https:\/\//.test(p.data.url)){res.status(400).json({error:'Informe a URL HTTPS oficial antes de abrir.'});return;}store.registration=store.registration.map(c=>c.city===req.params.city?{...c,...p.data}:c);save();res.json({ok:true});});
 router.post('/local-admin/posts',(req,res)=>{
 const p=z.object({id:z.number().optional(),revision:z.number().optional(),title:z.string().trim().min(5).max(180),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),excerpt:z.string().trim().min(10).max(500),category:z.enum(['Indústria','Varejo','Showbrinq','Mercado de brinquedos','Nossa história']),bodyHtml:z.string().min(20).max(150000),author:z.string().trim().min(2).max(120),sources:z.string().max(4000),status:z.enum(['draft','published']),seoTitle:z.string().max(180),seoDescription:z.string().max(500),coverUrl:z.union([z.enum(localCoverPaths),z.literal('')]).optional(),coverAlt:z.string().trim().max(500).optional()}).safeParse(req.body);
 if(!p.success){res.status(400).json({error:'Preencha os campos obrigatórios e use um slug válido.'});return;}
 const old=store.posts.find(v=>v.id===p.data.id);if(p.data.id&&!old){res.sendStatus(404);return;}if(old&&old.revision!==p.data.revision){res.status(409).json({error:'O artigo mudou. Reabra antes de salvar.'});return;}if(store.posts.some(v=>v.slug===p.data.slug&&v.id!==p.data.id)){res.status(409).json({error:'Este slug já está em uso.'});return;}
 const coverUrl=p.data.coverUrl??old?.coverUrl??'',coverAlt=p.data.coverAlt??old?.coverAlt??'';
 if(p.data.status==='published'&&(!coverUrl||coverAlt.trim().length<3)){res.status(400).json({error:'Selecione uma capa do acervo e descreva a imagem antes de publicar.'});return;}
 const now=new Date().toISOString();const post={...old,...p.data,id:old?.id||Math.max(0,...store.posts.map(p=>p.id))+1,revision:(old?.revision||0)+1,bodyHtml:sanitizeHtml(p.data.bodyHtml),coverUrl,coverAlt,featured:old?.featured||false,createdAt:old?.createdAt||now,updatedAt:now,publishedAt:p.data.status==='published'?(old?.publishedAt||now):null} as BlogPost;
 store.posts=[...store.posts.filter(v=>v.id!==post.id),post];save();res.json({post});
 });
 return {router,published,find:(slug:string)=>published().find(p=>p.slug===slug)||null};
}
