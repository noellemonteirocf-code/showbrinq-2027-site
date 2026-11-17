import { publicRouteMetadata } from '../shared/public-route-metadata';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ASSETS, APP_NAME } from '../src/config';
import { BlogIndexContent, BlogArticleContent, BlogNotFoundContent } from '../src/components/BlogViews';
import type { BlogPost } from '../shared/cms';
import { publishedOrigin } from './origins';

export type PublicBootstrap = {kind:'index';posts:BlogPost[]} | {kind:'article';post:BlogPost} | {kind:'not-found'};

function ServerFrame({children}:{children:React.ReactNode}) {
  const links = [['/#a-feira','A feira'],['/#quem-somos','Quem somos'],['/#circuito','Circuito 2027'],['/lojistas','Para lojistas'],['/expositores','Para expositores'],['/expositores-2026','Expositores 2026'],['/hoteis-parceiros','Hotéis'],['/blog','Conteúdos']];
  return <><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><div className="announcement" data-brand-preview="true"><span>O setor de brinquedos tem encontro marcado.</span><a href="/#circuito">Conheça o circuito 2027 →</a><span className="prototype-label">PRÉVIA</span></div><header className="site-header cms-ssr-header" data-brand-preview="true"><div className="container nav-inner"><a href="/" className="logo-link" aria-label={`${APP_NAME} — início`}><img className="official-brand-logo" src={ASSETS.logo} alt={APP_NAME}/></a><nav className="desktop-nav" aria-label="Navegação principal">{links.map(([url,label])=><a href={url} key={url} className={url==='/blog'?'active':undefined}>{label}</a>)}</nav><div className="header-actions"><a className="btn btn-primary header-cta" href="/expositores">Quero expor ↗</a><details className="cms-ssr-mobile-menu"><summary>Menu</summary><nav aria-label="Menu em celular">{links.map(([url,label])=><a href={url} key={url}>{label}</a>)}</nav></details></div></div></header><main id="conteudo">{children}</main><footer className="site-footer"><div className="container footer-main"><div className="footer-brand"><img className="official-brand-logo" src={ASSETS.logo} alt={APP_NAME}/><h3>O setor se encontra<br/>na SHOWBRINQ.</h3><p>Showroom de brinquedos e presentes.<br/>Realização: MN Eventos.</p></div><div><h4>O circuito</h4><a href="/#circuito">Cidades e datas de 2027</a><a href="/expositores-2026">Expositores de 2026</a><a href="/registros">Fotos e vídeos</a></div><div><h4>Sua participação</h4><a href="/lojistas">Para lojistas</a><a href="/expositores">Para expositores</a><a href="/hoteis-parceiros">Hotéis parceiros</a></div><div><h4>Conteúdos</h4><a href="/blog">Blog SHOWBRINQ</a><a href="/#contato">Fale com a equipe</a><a href="/privacidade">Privacidade</a></div></div></footer></>;
}

function escapeHtml(value:string):string {return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
function publicUrl(path:string) { return new URL(path,publishedOrigin).href; }

/** Only published post payloads may be passed here; all bodies have been sanitized server-side. */
export function renderBlogHtml(template:string,bootstrap:PublicBootstrap):string {
  const title=bootstrap.kind==='article' ? bootstrap.post.seoTitle || bootstrap.post.title : bootstrap.kind==='not-found' ? 'Artigo não encontrado | SHOWBRINQ' : publicRouteMetadata['/blog'].title;
  const description=bootstrap.kind==='article' ? bootstrap.post.seoDescription || bootstrap.post.excerpt : publicRouteMetadata['/blog'].description;
  const path=bootstrap.kind==='article' ? `/blog/${bootstrap.post.slug}` : '/blog';
  const image=bootstrap.kind==='article' && bootstrap.post.coverUrl ? publicUrl(bootstrap.post.coverUrl) : publicUrl('/assets/event-photo-01.webp');
  const body=renderToString(<ServerFrame>{bootstrap.kind==='article' ? <BlogArticleContent post={bootstrap.post}/> : bootstrap.kind==='index' ? <BlogIndexContent posts={bootstrap.posts}/> : <BlogNotFoundContent/>}</ServerFrame>);
  let output=template.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escapeHtml(title)+'</title>');
  output=output.replace(/<meta\s+name=["']description["'][^>]*>/i,`<meta name="description" content="${escapeHtml(description)}">`);
  output=output.replace(/<link\s+rel=["']canonical["'][^>]*>/gi,'').replace(/<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'');
  const structured = bootstrap.kind==='article' ? '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:bootstrap.post.title,datePublished:bootstrap.post.publishedAt,dateModified:bootstrap.post.updatedAt,author:{'@type':'Organization',name:bootstrap.post.author||'SHOWBRINQ'},mainEntityOfPage:publicUrl(path)}).replace(/</g,'\\u003c')+'</script>' : '';
  const metadata=structured+`<link rel="canonical" href="${escapeHtml(publicUrl(path))}"><meta property="og:type" content="${bootstrap.kind==='article'?'article':'website'}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(publicUrl(path))}"><meta property="og:site_name" content="SHOWBRINQ"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}">`;
  const data=JSON.stringify(bootstrap).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  output=output.replace('</head>',metadata+'</head>').replace(/<div\s+id=["']root["']\s*>\s*<\/div>/,`<div id="root">${body}</div><script>window.__CMS_PUBLIC__=${data};</script>`);
  return output;
}
