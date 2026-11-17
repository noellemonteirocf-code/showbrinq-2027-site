import { useEffect, useState } from 'react';
import type { BlogPost } from '../../shared/cms';
import { BlogIndexContent } from '../components/BlogViews';

export type CmsPublicBootstrap = { kind: 'index'; posts: BlogPost[] } | { kind: 'article'; post: BlogPost } | { kind: 'not-found' };

declare global { interface Window { __CMS_PUBLIC__?: CmsPublicBootstrap; } }

function usePublishedPosts() {
  const [posts,setPosts] = useState<BlogPost[]>(() => window.__CMS_PUBLIC__?.kind === 'index' ? window.__CMS_PUBLIC__.posts : []);
  const [loading,setLoading] = useState(!window.__CMS_PUBLIC__ || window.__CMS_PUBLIC__.kind !== 'index');
  const [error,setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/blog/posts', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Tente novamente em instantes.');
      const data = await response.json() as { posts: BlogPost[] };
      setPosts(data.posts); setError('');
    }).catch(err => { if (err.name !== 'AbortError') setError('Tente novamente em instantes.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return {posts, loading, error};
}

export function BlogPreview() {
  const {posts,loading,error} = usePublishedPosts();
  if (loading) return <section className="section" id="conteudos"><div className="container" role="status">Carregando conteúdos…</div></section>;
  return <BlogIndexContent posts={posts} error={error} compact />;
}

export default function BlogPage() {
  const {posts,loading,error} = usePublishedPosts();
  return <div className="blog-page public-blog-page">{loading ? <section className="section"><div className="container" role="status">Carregando conteúdos…</div></section> : <BlogIndexContent posts={posts} error={error} />}</div>;
}
