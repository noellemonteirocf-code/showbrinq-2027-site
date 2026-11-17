import { publicRouteMetadata } from '../shared/public-route-metadata';
import { regionalStrategy } from '../shared/regional-strategy';
import { editions } from '../src/data';
import { createLocalPlatform } from './local-platform';
import express, { type Request, type Response, type ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { authRouter, sessionRouter } from './auth';
import { adminPostsRouter, listPublishedPosts, findPublishedPost } from './posts';
import { adminMediaRouter, publicMediaRouter } from './media';
import { databaseReady } from './db';
import { renderBlogHtml, type PublicBootstrap } from './render-blog';
import { publishedOrigin } from './origins';

const app = express();
const httpServer = createServer(app);
const development = process.env.NODE_ENV !== 'production';
const root = process.cwd();
// Hostinger (and similar hosts) may hand over a numeric port or a socket/pipe path in PORT.
const rawPort = (process.env.PORT ?? '').trim();
const listenTarget: number | string = /^\d+$/.test(rawPort) ? Number(rawPort) : rawPort || 3000;
// Indexing stays off unless explicitly enabled after the organization approves publication.
const indexingEnabled = process.env.SITE_INDEXING === 'on';
const publicRobots = indexingEnabled ? 'index, follow' : 'noindex, nofollow';
app.disable('x-powered-by');
app.use(cookieParser());
app.use((req,res,next)=>{if(req.path.includes('.local-platform')){res.sendStatus(404);return;}next();});
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use('/api', (_req,res,next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});
app.get('/api/health', async (_req,res) => {
  const ready = localPlatform ? true : await databaseReady();
  res.status(ready ? 200 : 503).json({status: ready ? 'ready' : 'preparation_required'});
});
app.use(express.json({limit:'400kb'}));
const localPlatform = development && !process.env.DATABASE_URL ? createLocalPlatform(root) : null;
if(localPlatform) app.use('/api',localPlatform.router);
app.use('/api/auth', authRouter);
app.use('/api/admin', sessionRouter);
app.use('/api/admin/posts', adminPostsRouter);
app.use('/api/admin', adminMediaRouter);
app.use('/api/blog', publicMediaRouter);

app.get('/api/blog/posts', async (_req,res,next) => {
  try { res.json({posts:await (localPlatform ? Promise.resolve(localPlatform.published()) : listPublishedPosts())}); } catch(err) { next(err); }
});
app.get('/api/blog/posts/:slug', async (req,res,next) => {
  try {
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.params.slug)) {res.status(404).json({error:'Artigo não encontrado.'});return;}
    const post = await findPublishedPost(req.params.slug);
    if(!post) {res.status(404).json({error:'Artigo não encontrado.'});return;}
    res.json({post});
  } catch(err) {next(err);}
});
if(!localPlatform) {
  // Production has no registration table yet: serve the same "em breve" default the local preview starts with,
  // so the credenciamento page does not show a loading error. Official URLs are added in code when approved.
  app.get('/api/registration', (_req,res) => {res.json({cities:editions.map(edition=>({city:edition.id,status:'soon',url:''}))});});
}
app.use('/api', (_req,res) => {res.status(404).json({error:'Endpoint não encontrado.'});});

let transformHtml: (url:string,source:string) => Promise<string> = async (_url,source) => source;
let template = '';
if (development) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({server:{middlewareMode:true,hmr:{server:httpServer}},appType:'custom'});
  transformHtml = (url,source) => vite.transformIndexHtml(url,source);
  // Vite handles source files and the public directory, not page HTML.
  app.use(vite.middlewares);
} else {
  template = await readFile(path.join(root,'dist/index.html'),'utf8');
  if(indexingEnabled) template = template.replace(/<meta name="robots" content="noindex,nofollow"\/>/,'<meta name="robots" content="index,follow"/>');
  app.use(express.static(path.join(root,'dist'),{index:false,redirect:false,maxAge:0}));
}

async function htmlSource(url:string):Promise<string> {
  const source = development ? await readFile(path.join(root,'index.html'),'utf8') : template;
  return transformHtml(url,source);
}
async function sendBlog(req:Request,res:Response,bootstrap:PublicBootstrap,status=200) {
  const source = await htmlSource(req.originalUrl);
  res.setHeader('Cache-Control','no-store');
  // Preserve the project's explicit noindex until the launch/indexing decision is separately approved.
  res.setHeader('X-Robots-Tag',publicRobots);
  res.status(status).type('html').send(renderBlogHtml(source,bootstrap));
}
app.get('/blog',async(req,res,next)=>{try{await sendBlog(req,res,{kind:'index',posts:await (localPlatform ? Promise.resolve(localPlatform.published()) : listPublishedPosts())});}catch(err){next(err);}});
app.get('/blog/:slug',async(req,res,next)=>{
  try {
    const slug = req.params.slug;
    const post = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? await (localPlatform ? Promise.resolve(localPlatform.find(slug)) : findPublishedPost(slug)) : null;
    await sendBlog(req,res,post ? {kind:'article',post} : {kind:'not-found'},post ? 200 : 404);
  }catch(err){next(err);}
});
app.get('/blog/*',async(req,res,next)=>{try{await sendBlog(req,res,{kind:'not-found'},404);}catch(err){next(err);}});

// Gateway prefers supplied documents; private URLs and drafts are intentionally absent.
app.get('/robots.txt', (_req,res) => res.type('text/plain').send(indexingEnabled
  ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin-local\nDisallow: /api/\nSitemap: ${publishedOrigin}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n'));
app.get('/sitemap.xml', async (_req,res,next) => {
  try {
    // Static event pages remain discoverable if the CMS database is not configured.
    // Never fall back to draft or private content when published posts cannot be read.
    let posts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
    try { posts = await (localPlatform ? Promise.resolve(localPlatform.published()) : listPublishedPosts()); }
    catch { console.warn('Sitemap: published CMS posts unavailable; serving public event routes only.'); }
    const publicPaths = ['/','/circuito-2027','/lojistas','/estandes','/credenciamento','/expositores','/expositores-2026','/hoteis-parceiros','/blog','/registros','/privacidade','/caderno-de-visita','/planejador-de-participacao',...editions.map(edition=>`/edicoes/${edition.id}`),...posts.map(post=>`/blog/${post.slug}`)];
    const urls = publicPaths.map(p=>`<url><loc>${publishedOrigin}${p}</loc></url>`).join('');
    res.type('application/xml').setHeader('Cache-Control','no-store');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  } catch(err) {next(err);}
});
app.get('/admin',async(req,res,next)=>{
  try{res.type('html').set({'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}).send(await htmlSource(req.originalUrl));}catch(err){next(err);}
});
app.get('/admin/*',async(req,res,next)=>{
  try{res.type('html').set({'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}).send(await htmlSource(req.originalUrl));}catch(err){next(err);}
});
app.get('*',async(req,res,next)=>{
  try {
    if(/\.[a-z0-9]+$/i.test(req.path)) {res.status(404).type('text').send('Arquivo não encontrado.');return;}
    const known = ['/','/circuito-2027','/lojistas','/estandes','/credenciamento','/admin-local','/expositores','/expositores-2026','/hoteis-parceiros','/caderno-de-visita','/planejador-de-participacao','/registros','/privacidade'].includes(req.path) || /^\/edicoes\/(sao-luis|fortaleza|caruaru|feira-de-santana|goiania|piracicaba)$/.test(req.path);
    let source = await htmlSource(req.originalUrl);
    const edition = editions.find(item=>req.path===`/edicoes/${item.id}`);
    // The first HTML response must have meaningful metadata before the SPA hydrates.
    // Keep preview noindex unchanged until the organization approves publication.
    const metadata = edition ? regionalStrategy[edition.uf] : publicRouteMetadata[req.path] || null;
    if(metadata) {
      const escape = (value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
      source=source.replace(/<title>[^<]*<\/title>/,`<title>${escape(metadata.title)}</title>`).replace(/<meta name="description" content="[^"]*"\/>/,`<meta name="description" content="${escape(metadata.description)}"/>`);
    }
    res.status(known?200:404).type('html').set({'Cache-Control':'no-store','X-Robots-Tag':known?publicRobots:'noindex, nofollow'}).send(source);
  }catch(err){next(err);}
});
const errorHandler: ErrorRequestHandler = (err,req,res,_next) => {
  if(res.headersSent)return;
  const status = typeof err?.status === 'number' && err.status>=400 && err.status<600 ? err.status : 500;
  // No credentials, tokens, request bodies or raw DB messages enter the logs or response.
  console.error('CMS request failed',status);
  if(req.path.startsWith('/api/'))res.status(status).json({error:status===413?'O arquivo ou conteúdo excede o limite permitido.':'Não foi possível concluir esta operação. Tente novamente.'});
  else res.status(status).type('html').set('X-Robots-Tag','noindex, nofollow').send('<!doctype html><html lang="pt-BR"><head><title>Conteúdo temporariamente indisponível | SHOWBRINQ</title><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Conteúdo temporariamente indisponível.</h1><p>Tente novamente em instantes.</p><a href="/">Voltar à SHOWBRINQ</a></main></body></html>');
};
app.use(errorHandler);
const onListening = () => console.log(`SHOWBRINQ listening on ${typeof listenTarget === 'number' ? `port ${listenTarget}` : 'the socket provided in PORT'}`);
if(typeof listenTarget === 'number') httpServer.listen(listenTarget,development?'127.0.0.1':'0.0.0.0',onListening);
else httpServer.listen(listenTarget,onListening);
