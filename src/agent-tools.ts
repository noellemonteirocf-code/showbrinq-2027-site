// WebMCP: read-only tools for in-browser AI agents (navigator.modelContext.registerTool).
// Feature-detected, so browsers without WebMCP are unaffected.
import { editions } from './data';

type ToolResult = { content: { type: 'text'; text: string }[] };
type ModelContext = {
  registerTool: (tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: { readOnlyHint?: boolean };
    execute: (input: Record<string, unknown>) => Promise<ToolResult>;
  }) => unknown;
};

const text = (value: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });

export function registerAgentTools(): void {
  const modelContext = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') return;
  try {
    modelContext.registerTool({
      name: 'listar_edicoes_showbrinq_2027',
      description: 'Lista as seis edições do Circuito SHOWBRINQ 2027 (feira B2B de brinquedos) com cidade, estado, datas e link da página de cada edição.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => text(editions.map(e => ({
        cidade: e.city, estado: e.state, uf: e.uf, datas: e.dates,
        inicio: `${e.start.slice(0, 4)}-${e.start.slice(4, 6)}-${e.start.slice(6, 8)}`,
        url: `${location.origin}/edicoes/${e.id}`,
      }))),
    });
    modelContext.registerTool({
      name: 'listar_artigos_blog_showbrinq',
      description: 'Lista os artigos publicados no blog da SHOWBRINQ sobre o varejo e a indústria de brinquedos, com título, resumo e link.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const response = await fetch('/api/blog/posts');
        if (!response.ok) return text({ erro: 'Blog indisponível no momento.' });
        const { posts } = await response.json() as { posts: { title: string; excerpt: string; slug: string }[] };
        return text(posts.map(p => ({ titulo: p.title, resumo: p.excerpt, url: `${location.origin}/blog/${p.slug}` })));
      },
    });
  } catch { /* A WebMCP implementation that rejects a tool must not break the page. */ }
}
