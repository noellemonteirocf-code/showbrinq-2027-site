import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedOrigin,
  getAllowedOrigins,
  isPublishable,
  isSafeCoverUrl,
  isValidSlug,
  sanitizeBodyHtml,
  validatePostFields,
  visibleText,
} from '../security.js';
import { defaultPostFields } from '../../shared/cms.js';

const longText = 'Este conteúdo editorial contém informações detalhadas para leitores do setor de brinquedos e presentes, com contexto e explicações suficientes para uma leitura completa.';

test('slug validator only accepts normalized ASCII slugs', () => {
  assert.equal(isValidSlug('historia-showbrinq-2027'), true);
  assert.equal(isValidSlug('História-Showbrinq'), false);
  assert.equal(isValidSlug('../admin'), false);
  assert.equal(isValidSlug('duplo--hifen'), false);
});

test('sanitizer keeps the editor allowlist and removes scripts, embeds and event handlers', () => {
  const html = '<p onclick="x()">Olá <strong>mundo</strong><script>alert(1)</script></p><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)" onmouseover="x()">link</a><img src=x onerror=alert(1)>';
  const cleaned = sanitizeBodyHtml(html);
  assert.match(cleaned, /<strong>mundo<\/strong>/);
  assert.doesNotMatch(cleaned, /script|iframe|onclick|onmouseover|onerror|<img/i);
  assert.doesNotMatch(cleaned, /javascript:/i);
});

test('safe cover URLs allow local assets and private media ids but reject protocol-relative URLs', () => {
  assert.equal(isSafeCoverUrl('/assets/event-photo-01.webp'), true);
  assert.equal(isSafeCoverUrl('/api/admin/media/3'), true);
  assert.equal(isSafeCoverUrl('//evil.test/image.webp'), false);
  assert.equal(isSafeCoverUrl('javascript:alert(1)'), false);
});

test('post validator returns sanitized fields and publish rules require visible body and cover alt', () => {
  const parsed = validatePostFields({ ...defaultPostFields, title: 'Título', slug: 'titulo', excerpt: 'Resumo', bodyHtml: `<p>${longText}</p><script>x()</script>` });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.doesNotMatch(parsed.data.bodyHtml, /script/);
  assert.equal(visibleText(parsed.data.bodyHtml).length >= 100, true);
  assert.equal(isPublishable(parsed.data), true);
  assert.equal(isPublishable({ ...parsed.data, coverUrl: '/assets/capa.jpg', coverAlt: '' }), false);
});

test('origins require an exact HTTPS allow-listed origin', () => {
  const allowed = getAllowedOrigins()[0];
  assert.ok(allowed);
  assert.equal(isAllowedOrigin(allowed), true);
  assert.equal(isAllowedOrigin(`${allowed}/`), false);
  assert.equal(isAllowedOrigin('null'), false);
  assert.equal(isAllowedOrigin('http://localhost:3000'), false);
});
