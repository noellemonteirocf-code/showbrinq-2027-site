import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import express, { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { fileTypeFromBuffer } from 'file-type';
import { getDbPool } from './db.js';
import { requireAdmin, requireCsrf, type AdminRequest } from './auth.js';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Map<string, string>([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
interface MediaRow extends RowDataPacket {
  id: number; object_key: string; mime_type: string; byte_size: number; owner_open_id: string;
}

function safeError(res: Response, status: number, message: string, code: string): void {
  res.status(status).json({ error: message, code });
}
function parseMediaId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
function runtimeStorageConfig(): { apiUrl: string; apiKey: string } | null {
  const apiUrl = process.env.MANUS_API_URL?.trim();
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiUrl || !apiKey) return null;
  try { if (new URL(apiUrl).protocol !== 'https:') return null; } catch { return null; }
  return { apiUrl: apiUrl.replace(/\/+$/, ''), apiKey };
}

async function signedStorageUrl(kind: 'put' | 'get', objectKey: string): Promise<string> {
  const config = runtimeStorageConfig();
  if (!config) throw new Error('storage_unavailable');
  const response = await fetch(`${config.apiUrl}/v1/storage/presign/${kind}?path=${encodeURIComponent(objectKey)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('storage_unavailable');
  const body = await response.json() as { url?: unknown };
  if (typeof body.url !== 'string') throw new Error('storage_unavailable');
  try { if (new URL(body.url).protocol !== 'https:') throw new Error('invalid'); } catch { throw new Error('storage_unavailable'); }
  return body.url;
}

async function loadObject(objectKey: string): Promise<Buffer> {
  const url = await signedStorageUrl('get', objectKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'error' });
  if (!response.ok) throw new Error('storage_unavailable');
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_UPLOAD_BYTES) throw new Error('storage_unavailable');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('storage_unavailable');
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new Error('storage_unavailable');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

function serveImage(res: Response, row: MediaRow, bytes: Buffer): void {
  res.status(200);
  res.setHeader('Content-Type', row.mime_type);
  res.setHeader('Content-Length', String(bytes.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'no-store');
  res.end(bytes);
}

function asyncRoute(handler: (req: AdminRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AdminRequest, res: Response, next: NextFunction) => { void handler(req, res, next).catch(() => safeError(res, 503, 'O serviço de mídia está temporariamente indisponível.', 'media_unavailable')); };
}

export const adminMediaRouter = Router();
adminMediaRouter.post('/uploads', requireAdmin, requireCsrf, (req: Request, res: Response, next: NextFunction) => {
  const mime = (req.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (!allowedTypes.has(mime)) { safeError(res, 415, 'Formato não permitido. Envie JPEG, PNG ou WebP.', 'unsupported_media_type'); return; }
  const length = Number(req.get('content-length'));
  if (Number.isFinite(length) && length > MAX_UPLOAD_BYTES) { safeError(res, 413, 'A imagem deve ter no máximo 5 MB.', 'upload_too_large'); return; }
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES })(req, res, error => {
    if (error) {
      const status = (error as { status?: number }).status;
      safeError(res, status === 413 ? 413 : 400, status === 413 ? 'A imagem deve ter no máximo 5 MB.' : 'O arquivo enviado é inválido.', status === 413 ? 'upload_too_large' : 'invalid_upload');
      return;
    }
    void (async () => {
      try {
        const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) { safeError(res, bytes.length > MAX_UPLOAD_BYTES ? 413 : 400, bytes.length > MAX_UPLOAD_BYTES ? 'A imagem deve ter no máximo 5 MB.' : 'O arquivo enviado é inválido.', bytes.length > MAX_UPLOAD_BYTES ? 'upload_too_large' : 'invalid_upload'); return; }
        const fileType = await fileTypeFromBuffer(bytes);
        if (!fileType || fileType.mime !== mime || !allowedTypes.has(fileType.mime)) { safeError(res, 415, 'O conteúdo do arquivo não corresponde a JPEG, PNG ou WebP.', 'invalid_media_signature'); return; }
        const identity = (req as AdminRequest).adminIdentity;
        if (!identity) { safeError(res, 401, 'Autenticação necessária.', 'unauthorized'); return; }
        const key = `cms/${randomUUID()}.${allowedTypes.get(fileType.mime)}`;
        const uploadUrl = await signedStorageUrl('put', key);
        const uploadBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const uploaded = await fetch(uploadUrl, {
          method: 'PUT', headers: { 'Content-Type': fileType.mime }, body: uploadBody,
          signal: AbortSignal.timeout(30_000), redirect: 'error',
        });
        if (!uploaded.ok) { safeError(res, 503, 'Não foi possível armazenar a imagem.', 'storage_unavailable'); return; }
        const [result] = await getDbPool().execute<ResultSetHeader>(
          'INSERT INTO cms_media (object_key, mime_type, byte_size, owner_open_id) VALUES (?, ?, ?, ?)',
          [key, fileType.mime, bytes.length, identity.openId],
        );
        const mediaId = Number(result.insertId);
        res.status(201).json({ url: `/api/admin/media/${mediaId}`, mediaId });
      } catch {
        safeError(res, 503, 'O serviço de mídia está temporariamente indisponível.', 'media_unavailable');
      }
    })();
  });
});

adminMediaRouter.get('/media/:id', requireAdmin, asyncRoute(async (req, res) => {
  const id = parseMediaId(req.params.id);
  const identity = req.adminIdentity;
  if (!id) { safeError(res, 400, 'Identificador de mídia inválido.', 'invalid_id'); return; }
  if (!identity) { safeError(res, 401, 'Autenticação necessária.', 'unauthorized'); return; }
  const [rows] = await getDbPool().execute<MediaRow[]>('SELECT id, object_key, mime_type, byte_size, owner_open_id FROM cms_media WHERE id = ? AND owner_open_id = ? LIMIT 1', [id, identity.openId]);
  if (!rows.length) { safeError(res, 404, 'Imagem não encontrada.', 'not_found'); return; }
  if (!allowedTypes.has(rows[0].mime_type)) { safeError(res, 404, 'Imagem não encontrada.', 'not_found'); return; }
  const bytes = await loadObject(rows[0].object_key);
  if (bytes.length !== Number(rows[0].byte_size)) throw new Error('storage_unavailable');
  serveImage(res, rows[0], bytes);
}));

export const publicMediaRouter = Router();
publicMediaRouter.get('/media/:id', async (req: Request, res: Response) => {
  const id = parseMediaId(req.params.id);
  if (!id) { safeError(res, 404, 'Imagem não encontrada.', 'not_found'); return; }
  try {
    const [rows] = await getDbPool().execute<MediaRow[]>(
      `SELECT m.id, m.object_key, m.mime_type, m.byte_size, m.owner_open_id
       FROM cms_media m
       INNER JOIN cms_posts p ON p.cover_url = CONCAT('/api/admin/media/', m.id)
       WHERE m.id = ? AND p.status = 'published' LIMIT 1`,
      [id],
    );
    if (!rows.length) { safeError(res, 404, 'Imagem não encontrada.', 'not_found'); return; }
    if (!allowedTypes.has(rows[0].mime_type)) { safeError(res, 404, 'Imagem não encontrada.', 'not_found'); return; }
    const bytes = await loadObject(rows[0].object_key);
    if (bytes.length !== Number(rows[0].byte_size)) throw new Error('storage_unavailable');
    serveImage(res, rows[0], bytes);
  } catch {
    safeError(res, 503, 'O serviço de mídia está temporariamente indisponível.', 'media_unavailable');
  }
});
