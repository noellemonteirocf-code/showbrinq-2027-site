import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { closeDatabasePool, getDbPool } from '../server/db.js';
import { isPublishable, sanitizeBodyHtml, validatePostFields } from '../server/security.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const migrationDir = join(scriptDir, '..', 'server', 'migrations');
const seedPath = join(scriptDir, '..', 'server', 'seed-history.json');

interface MigrationRow extends RowDataPacket { checksum: string; }
interface SeedPost {
  title: string; slug: string; excerpt: string; category: string; coverUrl: string; coverAlt: string;
  bodyHtml: string; seoTitle: string; seoDescription: string; featured: boolean; publishedAt?: string;
}

function splitSql(sql: string): string[] {
  return sql.split(';').map(statement => statement.trim()).filter(Boolean);
}

async function ensureHistoryTable(): Promise<void> {
  const pool = getDbPool();
  await pool.execute(`CREATE TABLE IF NOT EXISTS cms_migrations (
    migration_id VARCHAR(191) NOT NULL,
    checksum CHAR(64) NOT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (migration_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function applyMigrations(): Promise<void> {
  const pool = getDbPool();
  await ensureHistoryTable();
  const files = (await readdir(migrationDir)).filter(name => /^\d+[-\w]*\.sql$/.test(name)).sort();
  for (const filename of files) {
    const source = await readFile(join(migrationDir, filename), 'utf8');
    const checksum = createHash('sha256').update(source).digest('hex');
    const [rows] = await pool.execute<MigrationRow[]>('SELECT checksum FROM cms_migrations WHERE migration_id = ?', [filename]);
    if (rows.length) {
      if (rows[0].checksum !== checksum) throw new Error(`Applied migration ${filename} was modified; refusing to continue.`);
      continue;
    }
    for (const statement of splitSql(source)) await pool.query(statement);
    await pool.execute('INSERT INTO cms_migrations (migration_id, checksum) VALUES (?, ?)', [filename, checksum]);
    process.stdout.write(`Applied ${filename}\n`);
  }
}

function parseSeed(raw: string): SeedPost {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Seed must contain one post object.');
  const post = value as Partial<SeedPost>;
  const parsed = validatePostFields({
    title: post.title, slug: post.slug, excerpt: post.excerpt, category: post.category,
    coverUrl: post.coverUrl, coverAlt: post.coverAlt, bodyHtml: post.bodyHtml,
    seoTitle: post.seoTitle, seoDescription: post.seoDescription, featured: post.featured,
  });
  if (!parsed.success) throw new Error('Seed post fields are invalid.');
  if (!isPublishable(parsed.data)) throw new Error('Seed post is not valid for publication.');
  const publishedAt = typeof post.publishedAt === 'string' && Number.isFinite(Date.parse(post.publishedAt))
    ? new Date(post.publishedAt).toISOString()
    : undefined;
  return { ...parsed.data, bodyHtml: sanitizeBodyHtml(parsed.data.bodyHtml), ...(publishedAt ? { publishedAt } : {}) };
}

async function importOptionalSeed(): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(seedPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  const checksum = createHash('sha256').update(raw).digest('hex');
  const pool = getDbPool();
  const migrationId = 'seed-history-showbrinq-v1';
  const [history] = await pool.execute<MigrationRow[]>('SELECT checksum FROM cms_migrations WHERE migration_id = ?', [migrationId]);
  if (history.length) {
    if (history[0].checksum !== checksum) throw new Error('The history seed migration changed after it was recorded.');
    return;
  }
  const seed = parseSeed(raw);
  if (seed.slug !== 'historia-showbrinq') throw new Error('The reserved history seed must use slug historia-showbrinq.');
  const publishedAt = seed.publishedAt ? new Date(seed.publishedAt) : new Date();
  const createdAt = seed.publishedAt ? publishedAt : new Date();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT IGNORE INTO cms_posts
      (title, slug, excerpt, category, cover_url, cover_alt, body_html, seo_title, seo_description, featured, status, revision, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1, ?, ?, ?)`,
    [seed.title, seed.slug, seed.excerpt, seed.category, seed.coverUrl, seed.coverAlt, seed.bodyHtml,
      seed.seoTitle || seed.title.slice(0, 70), seed.seoDescription || seed.excerpt.slice(0, 180),
      seed.featured, createdAt, createdAt, publishedAt],
  );
  if (result.affectedRows) process.stdout.write('Imported the existing history post without replacing any existing record.\n');
  await pool.execute('INSERT INTO cms_migrations (migration_id, checksum) VALUES (?, ?)', [migrationId, checksum]);
}

async function main(): Promise<void> {
  const pool = getDbPool();
  let connection: PoolConnection | undefined;
  let acquired = false;
  try {
    connection = await pool.getConnection();
    const [lockRows] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK('showbrq_cms_migrations', 30) AS acquired");
    acquired = lockRows[0]?.acquired === 1;
    if (!acquired) throw new Error('Could not acquire CMS migration lock.');
    await applyMigrations();
    await importOptionalSeed();
    process.stdout.write('CMS database migration complete.\n');
  } finally {
    if (connection) {
      if (acquired) {
        try { await connection.query("SELECT RELEASE_LOCK('showbrq_cms_migrations')"); } catch { /* release on connection close */ }
      }
      connection.release();
    }
    try { await closeDatabasePool(); } catch { /* preserve the migration failure and release the process */ }
  }
}

main().catch(error => {
  // Only static failure messages reach stderr; runtime credentials/SQL and seed contents are never printed.
  const message = error instanceof Error && /^(Applied migration|Seed |The reserved|The history seed|Could not acquire)/.test(error.message)
    ? error.message
    : 'CMS migration failed; inspect database connectivity and the migration source without exposing credentials.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
