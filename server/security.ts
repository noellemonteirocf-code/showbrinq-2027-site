import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import type { PostFields } from '../shared/cms.js';
import { allowedPublicOrigin, getAllowedOrigins } from './origins.js';

export { allowedPublicOrigin, getAllowedOrigins };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedTags = ['p', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'br'];
const allowedHrefSchemes = ['http', 'https', 'mailto'];
const privateMediaPath = /^\/api\/admin\/media\/([1-9]\d{0,9})$/;

function decodeEntityCodePoint(raw: string, radix: number): string {
  const codePoint = parseInt(raw, radix);
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : '\uFFFD';
}

export function isValidSlug(value: string): boolean {
  return value.length <= 160 && slugPattern.test(value);
}

export function sanitizeBodyHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: { a: ['href'] },
    allowedSchemes: allowedHrefSchemes,
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
  }).trim();
}

export function visibleText(value: string): string {
  const plain = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: 'discard' });
  return plain
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => decodeEntityCodePoint(code, 10))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) => decodeEntityCodePoint(code, 16))
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSafeCoverUrl(value: string): boolean {
  if (!value) return true;
  if (privateMediaPath.test(value)) return true;
  if (value.startsWith('/api/admin/media/')) return false;
  if (value.startsWith('/') && !value.startsWith('//') && !/[\\\u0000-\u001f]/.test(value)) {
    const path = value.split(/[?#]/, 1)[0];
    return path.split('/').every(part => part !== '.' && part !== '..');
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !/[\u0000-\u001f]/.test(value);
  } catch {
    return false;
  }
}

const postFieldsSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(160).regex(slugPattern),
  excerpt: z.string().trim().max(500),
  category: z.string().trim().min(1).max(100),
  coverUrl: z.string().trim().max(500),
  coverAlt: z.string().trim().max(255),
  bodyHtml: z.string().max(150_000),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(180),
  featured: z.boolean(),
}).strict();

export type PostFieldsValidation = { success: true; data: PostFields } | { success: false; message: string };

export function validatePostFields(value: unknown): PostFieldsValidation {
  const parsed = postFieldsSchema.safeParse(value);
  if (!parsed.success) return { success: false, message: 'Os campos do artigo são inválidos ou excedem os limites permitidos.' };
  if (!isValidSlug(parsed.data.slug)) return { success: false, message: 'O slug deve conter apenas letras minúsculas, números e hífens.' };
  if (!isSafeCoverUrl(parsed.data.coverUrl)) return { success: false, message: 'A URL da capa não é válida.' };
  return {
    success: true,
    data: { ...parsed.data, bodyHtml: sanitizeBodyHtml(parsed.data.bodyHtml) },
  };
}

export function applyPublishSeoFallback(fields: PostFields): PostFields {
  return {
    ...fields,
    seoTitle: fields.seoTitle.trim() || fields.title.trim().slice(0, 70),
    seoDescription: fields.seoDescription.trim() || fields.excerpt.trim().slice(0, 180),
  };
}

export function isPublishable(fields: PostFields): boolean {
  return Boolean(
    fields.title.trim() &&
    fields.excerpt.trim() &&
    visibleText(fields.bodyHtml).length >= 100 &&
    (!fields.coverUrl.trim() || fields.coverAlt.trim()) &&
    applyPublishSeoFallback(fields).seoTitle.length > 0 &&
    applyPublishSeoFallback(fields).seoDescription.length > 0,
  );
}

/** Exact allow-listed HTTPS origin check, shared with OAuth and mutating API middleware. */
export function isAllowedOrigin(value: unknown): value is string {
  return typeof value === 'string' && getAllowedOrigins().includes(value) && allowedPublicOrigin(value) === value;
}

export function extractPrivateMediaId(coverUrl: string): number | null {
  const match = privateMediaPath.exec(coverUrl);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
