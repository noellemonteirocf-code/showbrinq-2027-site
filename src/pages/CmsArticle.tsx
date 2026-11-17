import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BlogPost } from '../../shared/cms';
import { BlogArticleContent, BlogNotFoundContent } from '../components/BlogViews';

export default function CmsArticle({slug}:{slug:string}) {
  const bootstrap = window.__CMS_PUBLIC__;
  const initial = bootstrap?.kind === 'article' && bootstrap.post.slug === slug ? bootstrap.post : null;
  const [post,setPost] = useState<BlogPost|null>(initial);
  const [loading,setLoading] = useState(!initial);
  const [missing,setMissing] = useState(bootstrap?.kind === 'not-found');
  const [error,setError] = useState('');
  const openedSlug = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (loading || !post || post.slug !== slug || openedSlug.current === slug) return;
    openedSlug.current = slug;
    if (!window.location.hash) {
      // Reset once when the real article replaces its loading state, never on later updates.
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    const frame = requestAnimationFrame(() => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (!id) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(id)?.scrollIntoView({behavior:reduced || document.documentElement.dataset.motion === 'off' ? 'instant' : 'smooth',block:'start'});
    });
    return () => cancelAnimationFrame(frame);
  },[slug,loading,post?.slug]);
  useEffect(() => {
    const controller = new AbortController();
    if (!initial) setLoading(true);
    setMissing(false); setError('');
    fetch(`/api/blog/posts/${encodeURIComponent(slug)}`, {signal:controller.signal}).then(async response => {
      if (response.status === 404) {setPost(null); setMissing(true); return;}
      if (!response.ok) throw new Error('Não foi possível carregar o artigo.');
      const data = await response.json() as {post:BlogPost};
      setPost(data.post);
      document.title = data.post.seoTitle || data.post.title;
      const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if(description) description.content = data.post.seoDescription || data.post.excerpt;
    }).catch(err => {if(err.name !== 'AbortError') setError('Não foi possível carregar o artigo. Tente novamente em instantes.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[slug]);
  if(loading) return <section className="section"><div className="container" role="status">Carregando artigo…</div></section>;
  if(error) return <section className="section"><div className="container"><h1>O artigo está temporariamente indisponível.</h1><p role="alert">{error}</p><a href={`/blog/${encodeURIComponent(slug)}`}>Tentar novamente</a></div></section>;
  if(missing || !post) return <BlogNotFoundContent />;
  return <BlogArticleContent post={post} />;
}
