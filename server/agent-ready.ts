// Agent-readable representations of the public pages: server HTML fallback, Markdown,
// JSON-LD and llms.txt. Every fact here comes from the site's own data files.
import { publicRouteMetadata } from '../shared/public-route-metadata';
import { regionalStrategy } from '../shared/regional-strategy';
import { editions } from '../src/data';
import { INSTAGRAM_URL } from '../src/config';
import { publishedOrigin } from './origins';

// Same commercial WhatsApp the exhibitor form already opens (MN Eventos).
const WHATSAPP_E164 = '+5581999229812';
const WHATSAPP_URL = 'https://wa.me/5581999229812';

type Link = { label: string; href: string };
type Section = { heading: string; paragraphs?: string[]; links?: Link[] };
export type PageContent = { path: string; title: string; description: string; h1: string; sections: Section[] };

const HOME_H1 = 'No mercado de brinquedos, boas escolhas começam com bons encontros.';

function isoDate(compact: string, offsetDays = 0): string {
  const d = new Date(Date.UTC(Number(compact.slice(0, 4)), Number(compact.slice(4, 6)) - 1, Number(compact.slice(6, 8)) + offsetDays));
  return d.toISOString().slice(0, 10);
}

const circuitSection: Section = {
  heading: 'Circuito SHOWBRINQ 2027: cidades e datas',
  links: editions.map(e => ({ label: `${e.city} (${e.uf}) — ${e.dates}`, href: `/edicoes/${e.id}` })),
};

const navSection: Section = {
  heading: 'Páginas principais',
  links: [
    { label: 'Para lojistas: visitar a feira', href: '/lojistas' },
    { label: 'Para expositores: expor a marca', href: '/expositores' },
    { label: 'Modelos de estandes', href: '/estandes' },
    { label: 'Credenciamento por cidade', href: '/credenciamento' },
    { label: 'Hotéis parceiros', href: '/hoteis-parceiros' },
    { label: 'Blog SHOWBRINQ', href: '/blog' },
  ],
};

const aboutContactSection: Section = {
  heading: 'Sobre, contato e privacidade',
  paragraphs: ['Showroom de brinquedos e presentes. Realização: MN Eventos.'],
  links: [
    { label: 'Sobre a SHOWBRINQ', href: '/sobre' },
    { label: 'História da SHOWBRINQ', href: '/blog/historia-showbrinq' },
    { label: 'Contato', href: '/contato' },
    { label: `WhatsApp comercial: ${WHATSAPP_E164}`, href: WHATSAPP_URL },
    { label: 'Instagram @showbrinq.oficial', href: INSTAGRAM_URL },
    { label: 'Política de privacidade', href: '/privacidade' },
    { label: 'Termos de uso', href: '/termos' },
  ],
};

/** Content for a public, non-blog route; null for unknown or private routes. */
export function pageContentFor(path: string): PageContent | null {
  if (path === '/admin-local' || path.startsWith('/admin')) return null;
  const edition = editions.find(item => path === `/edicoes/${item.id}`);
  if (edition) {
    const meta = regionalStrategy[edition.uf];
    return {
      path, title: meta.title, description: meta.description,
      h1: `SHOWBRINQ 2027 em ${edition.city} (${edition.uf})`,
      sections: [
        { heading: 'Data', paragraphs: [`${edition.dates}, em ${edition.city}, ${edition.state}. Endereço e horários são confirmados pela organização na página da edição.`] },
        circuitSection, navSection, aboutContactSection,
      ],
    };
  }
  const meta = publicRouteMetadata[path];
  if (!meta) return null;
  const h1 = path === '/' ? HOME_H1 : meta.title.split(' | ')[0];
  return { path, title: meta.title, description: meta.description, h1, sections: [circuitSection, navSection, aboutContactSection] };
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
const abs = (href: string) => /^(https?:|tel:|mailto:)/.test(href) ? href : `${publishedOrigin}${href}`;

/** Plain semantic HTML placed inside #root; the React app replaces it when it mounts. */
export function fallbackHtml(page: PageContent): string {
  const sections = page.sections.map(s => `<section><h2>${esc(s.heading)}</h2>${(s.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('')}${s.links ? `<ul>${s.links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>` : ''}</section>`).join('');
  return `<main id="conteudo" data-server-fallback="true"><h1>${esc(page.h1)}</h1><p>${esc(page.description)}</p>${sections}</main>`;
}

export function pageMarkdown(page: PageContent): string {
  const lines = [`# ${page.h1}`, '', page.description, ''];
  for (const s of page.sections) {
    lines.push(`## ${s.heading}`, '');
    for (const p of s.paragraphs || []) lines.push(p, '');
    for (const l of s.links || []) lines.push(`- [${l.label}](${abs(l.href)})`);
    if (s.links?.length) lines.push('');
  }
  lines.push(`Fonte: ${publishedOrigin}${page.path}`, '');
  return lines.join('\n');
}

const organization = () => ({
  '@type': 'Organization', '@id': `${publishedOrigin}/#organization`, name: 'SHOWBRINQ',
  url: `${publishedOrigin}/`, logo: `${publishedOrigin}/assets/showbrinq-logo-oficial.png`,
  description: publicRouteMetadata['/'].description,
  sameAs: [INSTAGRAM_URL],
  contactPoint: { '@type': 'ContactPoint', name: 'WhatsApp comercial (MN Eventos)', telephone: WHATSAPP_E164, contactType: 'sales', availableLanguage: 'pt-BR', url: WHATSAPP_URL },
});

function editionEvent(e: (typeof editions)[number]) {
  return {
    '@type': 'Event', name: `SHOWBRINQ 2027 — ${e.city} - ${e.uf}`, url: `${publishedOrigin}/edicoes/${e.id}`,
    description: regionalStrategy[e.uf]?.description ?? publicRouteMetadata['/'].description,
    image: [`${publishedOrigin}/assets/event-photo-01.webp`],
    startDate: isoDate(e.start), endDate: isoDate(e.end, -1),
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: `${e.city} (${e.uf})`, address: { '@type': 'PostalAddress', addressLocality: e.city, addressRegion: e.uf, addressCountry: 'BR' } },
    organizer: { '@id': `${publishedOrigin}/#organization` },
    // Entrada gratuita para lojistas com CNPJ ou MEI (site: FAQ e privacidade); credenciamento por cidade.
    offers: {
      '@type': 'Offer', name: 'Entrada gratuita para lojistas com CNPJ ou MEI',
      description: 'Entrada gratuita para lojistas com CNPJ, inclusive MEI. Credenciamento por cidade, com abertura divulgada pela organização.',
      price: 0, priceCurrency: 'BRL', url: `${publishedOrigin}/credenciamento`,
    },
  };
}

/** JSON-LD graph: Organization, WebSite, WebPage and the 2027 editions as Events. */
export function structuredData(page: PageContent): string {
  const edition = editions.find(item => page.path === `/edicoes/${item.id}`);
  const events = edition ? [editionEvent(edition)] : (page.path === '/' || page.path === '/circuito-2027') ? editions.map(editionEvent) : [];
  const graph = [
    organization(),
    { '@type': 'WebSite', '@id': `${publishedOrigin}/#website`, url: `${publishedOrigin}/`, name: 'SHOWBRINQ', inLanguage: 'pt-BR', publisher: { '@id': `${publishedOrigin}/#organization` } },
    { '@type': 'WebPage', '@id': `${publishedOrigin}${page.path}#webpage`, url: `${publishedOrigin}${page.path}`, name: page.title, description: page.description, inLanguage: 'pt-BR', isPartOf: { '@id': `${publishedOrigin}/#website` } },
    ...events,
  ];
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

export function canonicalTag(path: string): string {
  return `<link rel="canonical" href="${esc(`${publishedOrigin}${path}`)}"/><link rel="alternate" type="text/markdown" href="${esc(`${publishedOrigin}${path}`)}"/>`;
}

/** RFC 8288 Link header advertising llms.txt and the Markdown variant of this URL. */
export function linkHeader(path: string): string {
  return `<${publishedOrigin}/llms.txt>; rel="describedby"; type="text/plain", <${publishedOrigin}${path}>; rel="alternate"; type="text/markdown", <${publishedOrigin}/sitemap.xml>; rel="sitemap"; type="application/xml"`;
}

export function llmsTxt(posts: { slug: string; title: string; excerpt: string }[]): string {
  const page = (path: string) => publicRouteMetadata[path];
  const lines = [
    '# SHOWBRINQ',
    '',
    `> ${publicRouteMetadata['/'].description}`,
    '',
    'Showroom e feira B2B de brinquedos e presentes, realizada pela MN Eventos. Entrada gratuita para lojistas com CNPJ ou MEI. Qualquer página deste site pode ser pedida em Markdown com o cabeçalho Accept: text/markdown.',
    '',
    '## Circuito 2027',
    ...editions.map(e => `- [${e.city} (${e.uf})](${publishedOrigin}/edicoes/${e.id}): ${e.dates}`),
    '',
    '## Páginas',
    ...['/lojistas', '/expositores', '/estandes', '/credenciamento', '/circuito-2027', '/hoteis-parceiros', '/registros', '/blog'].filter(p => page(p)).map(p => `- [${page(p).title}](${publishedOrigin}${p}): ${page(p).description}`),
    '',
    '## Blog',
    ...posts.map(p => `- [${p.title}](${publishedOrigin}/blog/${p.slug}): ${p.excerpt}`),
    '',
    '## Contato e institucional',
    `- WhatsApp comercial: ${WHATSAPP_URL}`,
    `- Instagram: ${INSTAGRAM_URL}`,
    `- Servidor MCP (somente leitura): ${publishedOrigin}/mcp — card em ${publishedOrigin}/.well-known/mcp/server-card.json`,
    `- [Sobre](${publishedOrigin}/sobre)`,
    `- [Contato](${publishedOrigin}/contato)`,
    `- [Termos de uso](${publishedOrigin}/termos)`,
    `- [Privacidade](${publishedOrigin}/privacidade)`,
    '',
  ];
  return lines.join('\n');
}
