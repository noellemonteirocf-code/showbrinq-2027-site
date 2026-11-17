import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';

let pool: Pool | undefined;

export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database unavailable');
    this.name = 'DatabaseUnavailableError';
  }
}

/** Creates the managed MySQL pool from its runtime URL, including driver URL TLS options. */
export function getDbPool(): Pool {
  if (pool) return pool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new DatabaseUnavailableError();

  try {
    const parsed = new URL(databaseUrl);
    if (!['mysql:', 'mysql2:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)) {
      throw new Error('invalid');
    }
    // Pass the URL untouched: mysql2 parses URL options such as ssl and keeps TLS policy intact.
    pool = mysql.createPool(databaseUrl);
    return pool;
  } catch {
    // Never include DATABASE_URL in an error, because it contains credentials.
    console.error('Database unavailable: DATABASE_URL is not a valid mysql:// URL (check percent-encoding of the password).');
    throw new DatabaseUnavailableError();
  }
}

/** Logs only the driver error code (e.g. ER_ACCESS_DENIED_ERROR), never messages that could echo credentials. */
function logDbFailure(context: string, error: unknown): void {
  const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : 'UNKNOWN';
  console.error(`Database ${context} failed: ${code}`);
}

export async function acquireDbConnection(): Promise<PoolConnection> {
  try {
    return await getDbPool().getConnection();
  } catch {
    throw new DatabaseUnavailableError();
  }
}

/** Health/readiness probe only; it does not migrate or mutate managed data. */
export async function databaseReady(): Promise<boolean> {
  try {
    const [rows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(*) FROM cms_migrations WHERE migration_id = '001-cms.sql') AS migration_ready,
        (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_name IN ('cms_admin', 'cms_media', 'cms_posts')) AS tables_ready,
        (SELECT COUNT(*) FROM cms_admin WHERE id = 1) AS admin_row_ready
    `);
    return rows.length === 1 && Number(rows[0].migration_ready) === 1 && Number(rows[0].tables_ready) === 3 && Number(rows[0].admin_row_ready) === 1;
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) logDbFailure('readiness check', error);
    return false;
  }
}

/** Close this process's pool, intended for finite migration/test scripts. */
export async function closeDatabasePool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = undefined;
  await current.end();
}
