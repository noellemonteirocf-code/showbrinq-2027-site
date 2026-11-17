import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { BlogPost, PostFields } from '../shared/cms.js';
import { getDbPool } from './db.js';
import { requireAdmin, requireCsrf, type AdminRequest } from './auth.js';
import {
  applyPublishSeoFallback,
  extractPrivateMediaId,
  isPublishable,
  validatePostFields,
} from './security.js';

interface PostRow extends RowDataPacket {
  id: number; title: string; slug: string; excerpt: string; category: string; cover_url: string; cover_alt: string;
  body_html: string; seo_title: string; seo_description: string; featured: number | boolean; status: 'draft' | 'published';
  revision: number; created_at: Date | string; updated_at: Date | string; published_at: Date | string | null;
  // Seconds from the database clock until published_at; keeps scheduling independent of time zones.
  publish_in_seconds?: number | string | null;
}
interface MediaOwnershipRow extends RowDataPacket { id: number; }
interface IdParams { id: string; }

const RESERVED_SLUG = 'historia-showbrinq';
const fieldsSql = 'title = ?, slug = ?, excerpt = ?, category = ?, cover_url = ?, cover_alt = ?, body_html = ?, seo_title = ?, seo_description = ?, featured = ?';
const fieldsValues = (fields: PostFields) => [fields.title, fields.slug, fields.excerpt, fields.category, fields.coverUrl, fields.coverAlt, fields.bodyHtml, fields.seoTitle, fields.seoDescription, fields.featured ? 1 : 0];

function asIso(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapPost(row: PostRow, publicView = false): BlogPost {
  let coverUrl = row.cover_url;
  if (publicView) {
    const mediaId = extractPrivateMediaId(coverUrl);
    if (mediaId) coverUrl = `/api/blog/media/${mediaId}`;
  }
  return {
    id: Number(row.id), title: row.title, slug: row.slug, excerpt: row.excerpt, category: row.category,
    coverUrl, coverAlt: row.cover_alt, bodyHtml: row.body_html, seoTitle: row.seo_title,
    seoDescription: row.seo_description, featured: Boolean(row.featured), status: row.status,
    revision: Number(row.revision), createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: asIso(row.updated_at) ?? new Date(0).toISOString(),
    publishedAt: row.publish_in_seconds !== null && row.publish_in_seconds !== undefined && row.published_at !== null
      ? new Date(Date.now() + Number(row.publish_in_seconds) * 1000).toISOString()
      : asIso(row.published_at),
  };
}

const selectColumns = 'id, title, slug, excerpt, category, cover_url, cover_alt, body_html, seo_title, seo_description, featured, status, revision, created_at, updated_at, published_at, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP(3), published_at) AS publish_in_seconds';

/** Public read API; status is constrained in SQL, never accept client-selected public rows. */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  const [rows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE status = 'published' AND published_at <= CURRENT_TIMESTAMP(3) ORDER BY featured DESC, published_at DESC, id DESC`);
  return rows.map(row => mapPost(row, true));
}

export async function findPublishedPost(slug: string): Promise<BlogPost | null> {
  if (typeof slug !== 'string' || slug.length > 160) return null;
  const [rows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE status = 'published' AND published_at <= CURRENT_TIMESTAMP(3) AND slug = ? LIMIT 1`, [slug]);
  return rows.length ? mapPost(rows[0], true) : null;
}

function parseId(raw: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id <= 4_294_967_295 ? id : null;
}

function parseRevision(body: unknown): number | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Number.isSafeInteger(record.revision) || (record.revision as number) < 1 || (record.revision as number) > 2_147_483_646) return null;
  return record.revision as number;
}

function safeFailure(res: Response): void {
  res.status(503).json({ error: 'O serviço de conteúdo está temporariamente indisponível.', code: 'cms_unavailable' });
}
function duplicate(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ER_DUP_ENTRY');
}

async function coverBelongsToAdmin(fields: PostFields, openId: string): Promise<boolean> {
  const mediaId = extractPrivateMediaId(fields.coverUrl);
  if (!mediaId) return true;
  const [rows] = await getDbPool().execute<MediaOwnershipRow[]>('SELECT id FROM cms_media WHERE id = ? AND owner_open_id = ? LIMIT 1', [mediaId, openId]);
  return rows.length === 1;
}

function asyncRoute(handler: (req: AdminRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AdminRequest, res: Response, next: NextFunction) => { void handler(req, res, next).catch(() => safeFailure(res)); };
}

export const adminPostsRouter = Router();
adminPostsRouter.use(requireAdmin);

adminPostsRouter.get('/', asyncRoute(async (_req, res) => {
  const [rows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts ORDER BY updated_at DESC, id DESC`);
  res.json({ posts: rows.map(row => mapPost(row)) });
}));

adminPostsRouter.get('/:id', asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: 'Identificador inválido.', code: 'invalid_id' }); return; }
  const [rows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) { res.status(404).json({ error: 'Artigo não encontrado.', code: 'not_found' }); return; }
  res.json({ post: mapPost(rows[0]) });
}));

adminPostsRouter.post('/', requireCsrf, asyncRoute(async (req, res) => {
  const parsed = validatePostFields(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.message, code: 'invalid_fields' }); return; }
  if (parsed.data.slug === RESERVED_SLUG) { res.status(409).json({ error: 'Este slug está reservado para o artigo histórico.', code: 'slug_reserved' }); return; }
  const identity = req.adminIdentity;
  if (!identity) { res.status(401).json({ error: 'Autenticação necessária.', code: 'unauthorized' }); return; }
  if (!(await coverBelongsToAdmin(parsed.data, identity.openId))) { res.status(400).json({ error: 'A imagem de capa não está disponível para esta conta.', code: 'invalid_cover' }); return; }
  try {
    const [result] = await getDbPool().execute<ResultSetHeader>(
      `INSERT INTO cms_posts (${selectColumns.replace(/\bid\b, /, '')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), NULL)`,
      fieldsValues(parsed.data),
    );
    const [rows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE id = ?`, [result.insertId]);
    res.status(201).json({ post: mapPost(rows[0]) });
  } catch (error) {
    if (duplicate(error)) { res.status(409).json({ error: 'Já existe um artigo com este slug.', code: 'slug_conflict' }); return; }
    throw error;
  }
}));

adminPostsRouter.put('/:id', requireCsrf, asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: 'Identificador inválido.', code: 'invalid_id' }); return; }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) { res.status(400).json({ error: 'Corpo da requisição inválido.', code: 'invalid_fields' }); return; }
  const { revision, ...fieldsValue } = req.body as Record<string, unknown>;
  if (!Number.isSafeInteger(revision) || (revision as number) < 1 || (revision as number) > 2_147_483_646) { res.status(400).json({ error: 'Revisão inválida.', code: 'invalid_revision' }); return; }
  const parsed = validatePostFields(fieldsValue);
  if (!parsed.success) { res.status(400).json({ error: parsed.message, code: 'invalid_fields' }); return; }
  const [existingRows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE id = ? LIMIT 1`, [id]);
  if (!existingRows.length) { res.status(404).json({ error: 'Artigo não encontrado.', code: 'not_found' }); return; }
  const existing = existingRows[0];
  if (parsed.data.slug === RESERVED_SLUG && existing.slug !== RESERVED_SLUG) { res.status(409).json({ error: 'Este slug está reservado para o artigo histórico.', code: 'slug_reserved' }); return; }
  if (existing.status === 'published' && !isPublishable(parsed.data)) {
    res.status(422).json({ error: 'Para manter o artigo publicado, informe título, resumo, ao menos 100 caracteres visíveis e texto alternativo da capa quando houver imagem.', code: 'not_publishable' }); return;
  }
  const savedFields = existing.status === 'published' ? applyPublishSeoFallback(parsed.data) : parsed.data;
  const identity = req.adminIdentity;
  if (!identity) { res.status(401).json({ error: 'Autenticação necessária.', code: 'unauthorized' }); return; }
  if (!(await coverBelongsToAdmin(parsed.data, identity.openId))) { res.status(400).json({ error: 'A imagem de capa não está disponível para esta conta.', code: 'invalid_cover' }); return; }
  try {
    const [result] = await getDbPool().execute<ResultSetHeader>(
      `UPDATE cms_posts SET ${fieldsSql}, revision = revision + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revision = ?`,
      [...fieldsValues(savedFields), id, revision],
    );
    if (!result.affectedRows) {
      const [rows] = await getDbPool().execute<PostRow[]>('SELECT id FROM cms_posts WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) { res.status(404).json({ error: 'Artigo não encontrado.', code: 'not_found' }); return; }
      res.status(409).json({ error: 'O artigo foi alterado em outra sessão. Atualize antes de salvar novamente.', code: 'revision_conflict' }); return;
    }
    const [rows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE id = ?`, [id]);
    res.json({ post: mapPost(rows[0]) });
  } catch (error) {
    if (duplicate(error)) { res.status(409).json({ error: 'Já existe um artigo com este slug.', code: 'slug_conflict' }); return; }
    throw error;
  }
}));

const MAX_SCHEDULE_SECONDS = 366 * 24 * 60 * 60;
/** Optional publishAt (ISO 8601) turns a publish into a scheduled publish; returns seconds from now or null. */
function parseSchedule(body: unknown): { ok: true; seconds: number | null } | { ok: false } {
  const record = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  if (record.publishAt === undefined || record.publishAt === null || record.publishAt === '') return { ok: true, seconds: null };
  if (typeof record.publishAt !== 'string' || record.publishAt.length > 40) return { ok: false };
  const at = Date.parse(record.publishAt);
  if (!Number.isFinite(at)) return { ok: false };
  const seconds = Math.round((at - Date.now()) / 1000);
  if (seconds < 60 || seconds > MAX_SCHEDULE_SECONDS) return { ok: false };
  return { ok: true, seconds };
}
function revisionOnly(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const { publishAt: _ignored, ...rest } = body as Record<string, unknown>;
  return rest;
}

async function changePublication(idRaw: string, body: unknown, publish: boolean, res: Response): Promise<void> {
  const schedule = publish ? parseSchedule(body) : { ok: true as const, seconds: null };
  if (!schedule.ok) { res.status(400).json({ error: 'Escolha uma data e hora de agendamento entre 1 minuto e 1 ano a partir de agora.', code: 'invalid_schedule' }); return; }
  body = revisionOnly(body);
  const id = parseId(idRaw);
  if (!id) { res.status(400).json({ error: 'Identificador inválido.', code: 'invalid_id' }); return; }
  const revision = parseRevision(body);
  if (!revision) { res.status(400).json({ error: 'Revisão inválida.', code: 'invalid_revision' }); return; }
  const [rows] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) { res.status(404).json({ error: 'Artigo não encontrado.', code: 'not_found' }); return; }
  const row = rows[0];
  if (Number(row.revision) !== revision) { res.status(409).json({ error: 'O artigo foi alterado em outra sessão. Atualize antes de continuar.', code: 'revision_conflict' }); return; }
  const fields: PostFields = {
    title: row.title, slug: row.slug, excerpt: row.excerpt, category: row.category, coverUrl: row.cover_url,
    coverAlt: row.cover_alt, bodyHtml: row.body_html, seoTitle: row.seo_title, seoDescription: row.seo_description, featured: Boolean(row.featured),
  };
  if (publish && !isPublishable(fields)) { res.status(422).json({ error: 'Para publicar, informe título, resumo, ao menos 100 caracteres visíveis no artigo e texto alternativo da capa quando houver imagem.', code: 'not_publishable' }); return; }
  const publishFields = publish ? applyPublishSeoFallback(fields) : fields;
  const [result] = await getDbPool().execute<ResultSetHeader>(
    publish
      ? schedule.seconds !== null
        ? `UPDATE cms_posts SET seo_title = ?, seo_description = ?, status = 'published', published_at = TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP(3)), revision = revision + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revision = ?`
        // Publish now: keep an earlier publication date, but bring a future (scheduled) date forward to now.
        : `UPDATE cms_posts SET seo_title = ?, seo_description = ?, status = 'published', published_at = CASE WHEN published_at IS NULL OR published_at > CURRENT_TIMESTAMP(3) THEN CURRENT_TIMESTAMP(3) ELSE published_at END, revision = revision + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revision = ?`
      : `UPDATE cms_posts SET status = 'draft', published_at = NULL, revision = revision + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revision = ?`,
    publish
      ? schedule.seconds !== null ? [publishFields.seoTitle, publishFields.seoDescription, schedule.seconds, id, revision] : [publishFields.seoTitle, publishFields.seoDescription, id, revision]
      : [id, revision],
  );
  if (!result.affectedRows) { res.status(409).json({ error: 'O artigo foi alterado em outra sessão. Atualize antes de continuar.', code: 'revision_conflict' }); return; }
  const [updated] = await getDbPool().execute<PostRow[]>(`SELECT ${selectColumns} FROM cms_posts WHERE id = ?`, [id]);
  res.json({ post: mapPost(updated[0]) });
}

adminPostsRouter.post('/:id/publish', requireCsrf, asyncRoute(async (req, res) => changePublication(req.params.id, req.body, true, res)));
adminPostsRouter.post('/:id/unpublish', requireCsrf, asyncRoute(async (req, res) => changePublication(req.params.id, req.body, false, res)));

// Do not forward database/driver details to clients if an integration mounts this router standalone.
adminPostsRouter.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) => safeFailure(res));
