import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';
import type { RowDataPacket } from 'mysql2/promise';
import type { AdminSession } from '../shared/cms.js';
import { acquireDbConnection, getDbPool } from './db.js';
import { isAllowedOrigin } from './security.js';

// Own e-mail + password login for the single blog administrator. The credentials live only in
// the host's environment variables (BLOG_ADMIN_EMAIL, BLOG_ADMIN_PASSWORD); nothing depends on Manus.
const SESSION_COOKIE = 'showbrinq_admin_session';
const APP_ID = 'showbrinq-cms';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const CSRF_TTL_SECONDS = 60 * 60;
const MIN_PASSWORD_LENGTH = 12;
const SAFE_ERRORS = {
  unauthenticated: 'Autenticação necessária.',
  forbidden: 'Acesso administrativo não autorizado.',
  unconfigured: 'O acesso ao painel ainda não foi configurado. Defina BLOG_ADMIN_EMAIL e BLOG_ADMIN_PASSWORD nas variáveis de ambiente.',
  origin: 'Origem não autorizada.',
  csrf: 'Token de segurança ausente ou inválido. Atualize a sessão e tente novamente.',
  credentials: 'E-mail ou senha incorretos.',
  locked: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.',
};

interface AuthConfig { adminEmail: string; passwordDigest: Buffer; secret: Uint8Array; }
interface SessionClaims extends JWTPayload { appId: string; openId: string; exp: number; }
interface ParsedSession { token: string; claims: SessionClaims; }
export interface AdminIdentity { openId: string; expiresAt: number; }
export interface AdminRequest extends Request { adminIdentity?: AdminIdentity; }
interface AdminRow extends RowDataPacket { open_id: string | null; }

export class AuthConfigurationError extends Error { constructor() { super('Auth configuration unavailable'); } }

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest();

function getAuthConfig(): AuthConfig {
  const adminEmail = process.env.BLOG_ADMIN_EMAIL?.trim().toLocaleLowerCase('en-US');
  const password = process.env.BLOG_ADMIN_PASSWORD ?? '';
  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || password.length < MIN_PASSWORD_LENGTH) throw new AuthConfigurationError();
  // Changing the password (or the database) invalidates every existing session.
  const secret = sha256(`showbrinq-admin-session-v1\0${adminEmail}\0${password}\0${process.env.DATABASE_URL ?? ''}`);
  return { adminEmail, passwordDigest: sha256(password), secret: new Uint8Array(secret) };
}

const adminOpenId = (email: string) => `email:${email}`;

/** Constant-time check of the submitted credentials against the configured ones. */
export function credentialsMatch(config: Pick<AuthConfig, 'adminEmail' | 'passwordDigest'>, email: string, password: string): boolean {
  const emailOk = timingSafeEqual(sha256(email.trim().toLocaleLowerCase('en-US')), sha256(config.adminEmail));
  const passwordOk = timingSafeEqual(sha256(password), config.passwordDigest);
  return emailOk && passwordOk;
}

/** In-memory lockout: after `max` failures inside `windowMs`, the key is blocked until the window ends. */
export function createLoginLimiter(max = 5, windowMs = 15 * 60 * 1000, now: () => number = Date.now) {
  const failures = new Map<string, { count: number; first: number }>();
  return {
    blocked(key: string): boolean {
      const entry = failures.get(key);
      if (!entry) return false;
      if (now() - entry.first > windowMs) { failures.delete(key); return false; }
      return entry.count >= max;
    },
    fail(key: string): void {
      const entry = failures.get(key);
      if (!entry || now() - entry.first > windowMs) failures.set(key, { count: 1, first: now() });
      else entry.count += 1;
    },
    reset(key: string): void { failures.delete(key); },
  };
}
const loginLimiter = createLoginLimiter();
// One lockout bucket per client address plus a global bucket, so a distributed attempt still trips it.
const limiterKeys = (req: Request) => [`ip:${req.ip ?? 'unknown'}`, 'global'];

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
  }
  return null;
}

const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' });
function setSessionCookie(res: Response, token: string): void { res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_SECONDS * 1000 }); }
function clearSessionCookie(res: Response): void { res.clearCookie(SESSION_COOKIE, cookieOptions()); }

async function createSessionToken(openId: string, config: AuthConfig): Promise<string> {
  return new SignJWT({ appId: APP_ID, openId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(config.secret);
}

async function readSession(req: Request): Promise<ParsedSession | null> {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token || token.length > 8192) return null;
  try {
    const config = getAuthConfig();
    const { payload } = await jwtVerify(token, config.secret, { algorithms: ['HS256'] });
    if (payload.appId !== APP_ID || payload.openId !== adminOpenId(config.adminEmail) || typeof payload.exp !== 'number') return null;
    return { token, claims: payload as SessionClaims };
  } catch { return null; }
}

/** Keeps cms_admin (used by the health check and media ownership) pointing at the configured admin. */
async function bindAdmin(openId: string, email: string): Promise<void> {
  const connection = await acquireDbConnection();
  try {
    const [rows] = await connection.execute<AdminRow[]>('SELECT open_id FROM cms_admin WHERE id = 1 LIMIT 1');
    if (rows.length !== 1) throw new AuthConfigurationError();
    if (rows[0].open_id !== openId) {
      await connection.execute('UPDATE cms_admin SET open_id = ?, email = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = 1', [openId, email]);
    }
  } finally {
    connection.release();
  }
}

export async function readAdminIdentity(req: Request): Promise<AdminIdentity | null> {
  const session = await readSession(req);
  return session ? { openId: session.claims.openId, expiresAt: session.claims.exp } : null;
}

function sendError(res: Response, status: number, error: string, code: string): void {
  res.status(status).json({ error, code });
}

export const requireAdmin: RequestHandler = async (req: AdminRequest, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { getAuthConfig(); }
  catch { sendError(res, 503, SAFE_ERRORS.unconfigured, 'unconfigured'); return; }
  const identity = await readAdminIdentity(req);
  if (!identity) { sendError(res, 401, SAFE_ERRORS.unauthenticated, 'unauthorized'); return; }
  req.adminIdentity = identity;
  next();
};

const sessionHash = (token: string) => createHash('sha256').update(token).digest('base64url');

async function createCsrfToken(session: ParsedSession, config: AuthConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.min(session.claims.exp, now + CSRF_TTL_SECONDS);
  return new SignJWT({ purpose: 'cms-csrf', appId: APP_ID, openId: session.claims.openId, sessionHash: sessionHash(session.token) })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt(now).setExpirationTime(exp).sign(config.secret);
}

export const requireCsrf: RequestHandler = async (req: AdminRequest, res: Response, next: NextFunction) => {
  if (!isAllowedOrigin(req.get('origin'))) { sendError(res, 403, SAFE_ERRORS.origin, 'origin_forbidden'); return; }
  const session = await readSession(req);
  if (!session) { sendError(res, 401, SAFE_ERRORS.unauthenticated, 'unauthorized'); return; }
  const supplied = req.get('x-csrf-token');
  if (!supplied || supplied.length > 4096) { sendError(res, 403, SAFE_ERRORS.csrf, 'csrf_invalid'); return; }
  try {
    const config = getAuthConfig();
    const { payload } = await jwtVerify(supplied, config.secret, { algorithms: ['HS256'] });
    if (payload.purpose !== 'cms-csrf' || payload.appId !== APP_ID || payload.openId !== session.claims.openId || payload.sessionHash !== sessionHash(session.token)) {
      sendError(res, 403, SAFE_ERRORS.csrf, 'csrf_invalid'); return;
    }
    next();
  } catch {
    sendError(res, 403, SAFE_ERRORS.csrf, 'csrf_invalid');
  }
};

export const authRouter = Router();
export const sessionRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!isAllowedOrigin(req.get('origin'))) { sendError(res, 403, SAFE_ERRORS.origin, 'origin_forbidden'); return; }
  let config: AuthConfig;
  try { config = getAuthConfig(); }
  catch { sendError(res, 503, SAFE_ERRORS.unconfigured, 'unconfigured'); return; }
  const keys = limiterKeys(req);
  if (keys.some(key => loginLimiter.blocked(key))) { sendError(res, 429, SAFE_ERRORS.locked, 'too_many_attempts'); return; }
  const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
  const email = typeof body.email === 'string' ? body.email.slice(0, 320) : '';
  const password = typeof body.password === 'string' ? body.password.slice(0, 1024) : '';
  if (!credentialsMatch(config, email, password)) {
    keys.forEach(key => loginLimiter.fail(key));
    sendError(res, 401, SAFE_ERRORS.credentials, 'invalid_credentials');
    return;
  }
  keys.forEach(key => loginLimiter.reset(key));
  try {
    const openId = adminOpenId(config.adminEmail);
    await bindAdmin(openId, config.adminEmail);
    setSessionCookie(res, await createSessionToken(openId, config));
    res.status(204).end();
  } catch {
    sendError(res, 503, SAFE_ERRORS.unconfigured, 'unavailable');
  }
});

// The former Manus OAuth endpoints are gone; answer clearly instead of a generic 404.
authRouter.get(['/start', '/callback'], (_req: Request, res: Response) => {
  res.redirect(302, '/admin');
});

authRouter.post('/logout', requireAdmin, requireCsrf, (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.status(204).end();
});

sessionRouter.get('/session', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  let config: AuthConfig;
  try { config = getAuthConfig(); }
  catch {
    const session: AdminSession = { authenticated: false, authorized: false, configured: false, reason: SAFE_ERRORS.unconfigured };
    res.status(503).json(session); return;
  }
  try {
    const [rows] = await getDbPool().execute<AdminRow[]>('SELECT open_id FROM cms_admin WHERE id = 1 LIMIT 1');
    if (rows.length !== 1) {
      const session: AdminSession = { authenticated: false, authorized: false, configured: false, reason: SAFE_ERRORS.unconfigured };
      res.status(503).json(session); return;
    }
    const auth = await readSession(req);
    if (!auth) {
      const result: AdminSession = { authenticated: false, authorized: false, configured: true, reason: SAFE_ERRORS.unauthenticated };
      res.status(200).json(result); return;
    }
    const csrfToken = await createCsrfToken(auth, config);
    const result: AdminSession = { authenticated: true, authorized: true, configured: true, name: 'Administrador', csrfToken };
    res.status(200).json(result);
  } catch {
    const result: AdminSession = { authenticated: false, authorized: false, configured: false, reason: SAFE_ERRORS.unconfigured };
    res.status(503).json(result);
  }
});
