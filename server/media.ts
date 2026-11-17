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
// Images live in MySQL (cms_media_blobs), so they survive redeploys and need no external storage.
interface BlobRow extends RowDataPacket { data: Buffer; }
let blobTableReady: Promise<void> | undefined;
function ensureBlobTable(): Promise<void> {
  blobTableReady ??= getDbPool().query(`CREATE TABLE IF NOT EXISTS cms_media_blobs (
    media_id BIGINT UNSIGNED NOT NULL,
    data MEDIUMBLOB NOT NULL,
    PRIMARY KEY (media_id),
    CONSTRAINT fk_cms_media_blobs_media FOREIGN KEY (media_id) REFERENCES cms_media (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).then(() => undefined).catch(error => { blobTableReady = undefined; throw error; });
  return blobTableReady;
}

async function loadObject(mediaId: number): Promise<Buffer> {
  await ensureBlobTable();
  const [rows] = await getDbPool().execute<BlobRow[]>('SELECT data FROM cms_media_blobs WHERE media_id = ? LIMIT 1', [mediaId]);
  if (!rows.length) throw new Error('storage_unavailable');
  return Buffer.from(rows[0].data);
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
        await ensureBlobTable();
        const connection = await getDbPool().getConnection();
        let mediaIdValue: number;
        try {
          await connection.beginTransaction();
          const [result] = await connection.execute<ResultSetHeader>(
            'INSERT INTO cms_media (object_key, mime_type, byte_size, owner_open_id) VALUES (?, ?, ?, ?)',
            [key, fileType.mime, bytes.length, identity.openId],
          );
          mediaIdValue = Number(result.insertId);
          await connection.execute('INSERT INTO cms_media_blobs (media_id, data) VALUES (?, ?)', [mediaIdValue, bytes]);
          await connection.commit();
        } catch (error) {
          try { await connection.rollback(); } catch { /* keep failures generic */ }
          throw error;
        } finally {
          connection.release();
        }
        const mediaId = mediaIdValue;
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
  const [rows] = await getDbPool().execute<MediaRow[]>('SELECT id, object_key, mime_type, byte_size, owner_open_id FROM cms_media WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) { safeError(res, 404, 'Imagem não encontrada.', 'not_found'); return; }
  if (!allowedTypes.has(rows[0].mime_type)) { safeError(res, 404, 'Imagem não encontrada.', 'not_found'); return; }
  const bytes = await loadObject(Number(rows[0].id));
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
    const bytes = await loadObject(Number(rows[0].id));
    if (bytes.length !== Number(rows[0].byte_size)) throw new Error('storage_unavailable');
    serveImage(res, rows[0], bytes);
  } catch {
    safeError(res, 503, 'O serviço de mídia está temporariamente indisponível.', 'media_unavailable');
  }
});
