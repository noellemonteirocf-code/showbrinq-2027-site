import { publicRouteMetadata as routeMetadata } from '../shared/public-route-metadata';
import { regionalStrategy } from '../shared/regional-strategy';
import React, { useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Route, Switch, useLocation, useSearch } from 'wouter';
import Layout from './components/Layout';
import Home from './pages/Home';
import Stands from './pages/Stands';
import CircuitLanding from './pages/CircuitLanding';
import Registration from './pages/Registration';
import LocalAdmin from './pages/LocalAdmin';
import './funnel.css';
import Audience from './pages/Audience';
import Tools from './pages/Tools';
import BlogPage from './pages/Blog';
import CmsArticle from './pages/CmsArticle';
import HotelsPage from './pages/Hotels';
import Exhibitors2026Page from './components/HistoricalBrands';
import { EditionPage, RecordsPage, PrivacyPage, NotFound, AboutPage, ContactPage, TermsPage } from './pages/Other';
import { editions } from './data';
import { registerAgentTools } from './agent-tools';
import './styles.css';
import './theme.css';
import './blog.css';
import './redesign.css';
import './seo-pages.css';
import './history-article.css';
import './canva-inspired.css';
import './who-we-are.css';
import './public-blog.css';
import './cms-public.css';
import './phase-one.css';
import './kit-stickers.css';
import './editorial-kit.css';
import './art-direction-2027.css';
import './audience-direction.css';
import './market-stories.css';
import './official-brand.css';
import './campaign-identity.css';
import './editorial-refinement.css';
import './blog-editorial.css';
import './history-visual.css';
import './home-visual-polish.css';
import './home-editorial-v5.css';
import './home-ludic-v5.css';
import './home-ludic-polish-v5.css';
import './home-organic-finish.css';
import './audit-accessibility.css';
import './navigation-clarity.css';
import './polimento-mobile-2027.css';
import './estandes-hero-2027.css';
import './polimento-global-2027.css';

const AdminPage = lazy(() => import('./pages/Admin'));

function ToolRoute({kind}:{kind:'visit'|'exhibit'}) {
  const search=useSearch();
  return <Tools key={`${kind}-${search}`} kind={kind}/>;
}


function metadataFor(path:string) {
  if(path === '/admin' || path.startsWith('/admin/')) return {title:'Painel privado do Blog | SHOWBRINQ',description:'Área privada de administração do Blog SHOWBRINQ.'};
  if(path.startsWith('/blog/') && window.__CMS_PUBLIC__?.kind === 'article' && path === `/blog/${window.__CMS_PUBLIC__.post.slug}`) {
    const post = window.__CMS_PUBLIC__.post;
    return {title:post.seoTitle || post.title,description:post.seoDescription || post.excerpt};
  }
  const cityMatch=path.match(/^\/edicoes\/([^/]+)$/);
  if(cityMatch) {
    const id=decodeURIComponent(cityMatch[1]);
    const edition=editions.find(item=>item.id===id);
    if(edition) return regionalStrategy[edition.uf];
    return {title:'Edição não encontrada | SHOWBRINQ 2027',description:'Esta edição não foi encontrada no calendário SHOWBRINQ 2027.'};
  }
  return routeMetadata[path] ?? {
    title:'SHOWBRINQ 2027 | Circuito de brinquedos e presentes',
    description:'Feira de negócios para lojistas, fabricantes e representantes do setor de brinquedos e presentes.',
  };
}

function App() {
  const [loc]=useLocation();
  const search=useSearch();
  useEffect(()=>{
    const metadata=metadataFor(loc);
    document.title=metadata.title;
    let description=document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if(!description) {
      description=document.createElement('meta');
      description.name='description';
      document.head.appendChild(description);
    }
    description.content=metadata.description;
  },[loc,search]);

  useLayoutEffect(() => {
    let frame = 0;
    let observer: MutationObserver | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const clearPending = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      observer = undefined;
      if (deadline) clearTimeout(deadline);
      deadline = undefined;
    };
    const go = () => {
      clearPending();
      const hash = window.location.hash;
      if (!hash) {
        window.scrollTo({top:0,behavior:'instant'});
        return;
      }
      let id: string;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      const align = () => {
        if (disposed || window.location.hash !== hash) return false;
        const target = document.getElementById(id);
        if (!target) return false;
        clearPending();
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({behavior:reduced || document.documentElement.dataset.motion === 'off' ? 'instant' : 'smooth',block:'start'});
        return true;
      };
      // Run against the committed route, observing only while an async target is absent.
      frame = requestAnimationFrame(() => {
        if (align() || disposed) return;
        observer = new MutationObserver(() => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(align);
        });
        observer.observe(document.getElementById('root') || document.body,{childList:true,subtree:true});
        deadline = setTimeout(clearPending,4000);
      });
    };
    go();
    window.addEventListener('hashchange',go);
    // Wouter changes a same-page hash through history, without a native hashchange.
    // Schedule after the route commits; cleanup cancels a stale route's callback.
    const afterNavigation = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (!disposed) go(); });
    };
    window.addEventListener('pushState',afterNavigation);
    window.addEventListener('replaceState',afterNavigation);
    window.addEventListener('pageshow',afterNavigation);
    window.addEventListener('load',afterNavigation);
    return () => {
      disposed = true;
      clearPending();
      window.removeEventListener('hashchange',go);
      window.removeEventListener('pushState',afterNavigation);
      window.removeEventListener('replaceState',afterNavigation);
      window.removeEventListener('pageshow',afterNavigation);
      window.removeEventListener('load',afterNavigation);
    };
  },[loc,search]);
  if(loc === '/admin' || loc.startsWith('/admin/')) return <Suspense fallback={<main style={{padding:'40px',fontSize:'18px'}}>Carregando painel…</main>}><AdminPage /></Suspense>;
  if(loc === "/admin-local" && new URLSearchParams(search).get("painel")==="visual") return <LocalAdmin/>;
  return <Layout><Switch>
    <Route path="/" component={Home}/>
    <Route path="/circuito-2027" component={CircuitLanding}/>
    <Route path="/estandes" component={Stands}/>
    <Route path="/credenciamento" component={Registration}/>
    <Route path="/admin-local" component={LocalAdmin}/>
    <Route path="/lojistas"><Audience profile="lojista"/></Route>
    <Route path="/expositores"><Audience profile="expositor"/></Route>
    <Route path="/expositores-2026" component={Exhibitors2026Page}/>
    <Route path="/hoteis-parceiros" component={HotelsPage}/>
    <Route path="/blog/:slug">{params=><CmsArticle key={params.slug} slug={params.slug}/>}</Route>
    <Route path="/blog" component={BlogPage}/>
    <Route path="/caderno-de-visita"><ToolRoute kind="visit"/></Route>
    <Route path="/planejador-de-participacao"><ToolRoute kind="exhibit"/></Route>
    <Route path="/edicoes/:id">{params=><EditionPage id={params.id}/>}</Route>
    <Route path="/registros" component={RecordsPage}/>
    <Route path="/privacidade" component={PrivacyPage}/>
    <Route path="/sobre" component={AboutPage}/>
    <Route path="/contato" component={ContactPage}/>
    <Route path="/termos" component={TermsPage}/>
    <Route component={NotFound}/>
  </Switch></Layout>;
}

// Keep native restoration from overriding the route's committed scroll position.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
registerAgentTools();
