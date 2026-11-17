// Minimal, read-only MCP server over Streamable HTTP (stateless JSON responses) plus its
// Server Card (SEP-1649). Tools expose only public data already shown on the site.
import { Router, type Request, type Response } from 'express';
import { editions } from '../src/data';
import { publishedOrigin } from './origins';

const SERVER_NAME = 'showbrinq';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

type Post = { slug: string; title: string; excerpt: string; category: string; publishedAt: string | null };
type JsonRpc = { jsonrpc?: string; id?: string | number | null; method?: unknown; params?: Record<string, unknown> };

const tools = [
  {
    name: 'listar_edicoes',
    title: 'Edições do Circuito SHOWBRINQ 2027',
    description: 'Lista as seis edições do Circuito SHOWBRINQ 2027 (feira B2B de brinquedos e presentes) com cidade, estado, datas e página de cada edição.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'listar_artigos_blog',
    title: 'Artigos do blog SHOWBRINQ',
    description: 'Lista os artigos publicados no blog da SHOWBRINQ sobre o varejo e a indústria de brinquedos, com título, resumo, categoria e link.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'contato',
    title: 'Contato da SHOWBRINQ',
    description: 'Retorna os canais oficiais de contato da SHOWBRINQ (WhatsApp comercial da MN Eventos, Instagram e páginas de contato).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const iso = (c: string) => `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}`;
const textResult = (value: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: { result: value } });

export function serverCard() {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
    version: '1.0',
    protocolVersion: PROTOCOL_VERSIONS[0],
    serverInfo: { name: SERVER_NAME, title: 'SHOWBRINQ', version: SERVER_VERSION },
    description: 'Servidor MCP somente leitura da SHOWBRINQ, feira B2B de brinquedos e presentes: edições do Circuito 2027, artigos do blog e contato.',
    documentationUrl: `${publishedOrigin}/llms.txt`,
    transport: { type: 'streamable-http', endpoint: `${publishedOrigin}/mcp` },
    capabilities: { tools: { listChanged: false } },
    authentication: { required: false },
    tools: tools.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema })),
  };
}

export function createMcpRouter(listPosts: () => Promise<Post[]>) {
  const router = Router();

  async function callTool(name: string) {
    if (name === 'listar_edicoes') {
      return textResult(editions.map(e => ({ cidade: e.city, estado: e.state, uf: e.uf, datas: e.dates, inicio: iso(e.start), url: `${publishedOrigin}/edicoes/${e.id}` })));
    }
    if (name === 'listar_artigos_blog') {
      const posts = await listPosts();
      return textResult(posts.map(p => ({ titulo: p.title, resumo: p.excerpt, categoria: p.category, publicado_em: p.publishedAt, url: `${publishedOrigin}/blog/${p.slug}` })));
    }
    if (name === 'contato') {
      return textResult({ whatsapp_comercial: 'https://wa.me/5581999229812', whatsapp_numero: '+55 81 99922-9812', instagram: 'https://www.instagram.com/showbrinq.oficial/', pagina_contato: `${publishedOrigin}/contato`, realizacao: 'MN Eventos' });
    }
    return null;
  }

  async function handle(message: JsonRpc) {
    const id = message.id ?? null;
    const method = typeof message.method === 'string' ? message.method : '';
    const error = (code: number, msg: string) => ({ jsonrpc: '2.0', id, error: { code, message: msg } });
    if (message.jsonrpc !== '2.0' || !method) return error(-32600, 'Invalid Request');
    if (message.id === undefined) return null; // notification: no response
    switch (method) {
      case 'initialize': {
        const requested = typeof message.params?.protocolVersion === 'string' ? message.params.protocolVersion : '';
        return { jsonrpc: '2.0', id, result: {
          protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, title: 'SHOWBRINQ', version: SERVER_VERSION },
          instructions: 'Dados públicos da SHOWBRINQ. Datas, locais e condições de cada edição devem ser confirmados pela organização.',
        } };
      }
      case 'ping': return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list': return { jsonrpc: '2.0', id, result: { tools } };
      case 'tools/call': {
        const name = typeof message.params?.name === 'string' ? message.params.name : '';
        try {
          const result = await callTool(name);
          return result ? { jsonrpc: '2.0', id, result } : error(-32602, `Unknown tool: ${name}`);
        } catch {
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Dados indisponíveis no momento.' }], isError: true } };
        }
      }
      default: return error(-32601, 'Method not found');
    }
  }

  router.post('/mcp', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const body = req.body as JsonRpc | JsonRpc[] | undefined;
    if (!body || typeof body !== 'object') { res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
    const messages = Array.isArray(body) ? body : [body];
    const responses = (await Promise.all(messages.map(handle))).filter(Boolean);
    if (!responses.length) { res.status(202).end(); return; }
    res.json(Array.isArray(body) ? responses : responses[0]);
  });
  router.get('/mcp', (_req, res) => { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'Use POST com JSON-RPC (MCP Streamable HTTP).' }); });
  router.delete('/mcp', (_req, res) => { res.status(405).end(); });
  router.get('/.well-known/mcp/server-card.json', (_req, res) => { res.setHeader('Cache-Control', 'public, max-age=3600'); res.setHeader('Access-Control-Allow-Origin', '*'); res.json(serverCard()); });
  return router;
}
