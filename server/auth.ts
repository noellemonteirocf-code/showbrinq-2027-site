import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';
import type { RowDataPacket } from 'mysql2/promise';
import type { AdminSession } from '../shared/cms.js';
import { acquireDbConnection, getDbPool } from './db.js';
import { allowedPublicOrigin, isAllowedOrigin } from './security.js';

const SESSION_COOKIE = 'webdev_app_session';
const OAUTH_STATE_COOKIE = 'cms_oauth_state';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const OAUTH_TTL_SECONDS = 10 * 60;
const CSRF_TTL_SECONDS = 60 * 60;
const CALLBACK_PATH = '/api/auth/callback';
const SESSION_PATH = '/';
const SAFE_ERRORS = {
  unauthenticated: 'Autenticação necessária.',
  forbidden: 'Acesso administrativo não autorizado.',
  unconfigured: 'Autenticação administrativa indisponível. Verifique a configuração do serviço.',
  origin: 'Origem não autorizada.',
  csrf: 'Token de segurança ausente ou inválido. Atualize a sessão e tente novamente.',
  generic: 'Não foi possível concluir a autenticação. Tente novamente.',
};

interface OAuthConfig {
  projectId: string;
  portalUrl: string;
  apiUrl: string;
  secret: Uint8Array;
  adminEmail: string;
}
interface OAuthState { redirectUri: string; nonce: string; }
interface ManusIdentity { openId: string; email: string; name?: string; }
interface SessionClaims extends JWTPayload { appId: string; openId: string; exp: number; name?: string; }
interface ParsedSession { token: string; claims: SessionClaims; }
export interface AdminIdentity { openId: string; expiresAt: number; }
export interface AdminRequest extends Request { adminIdentity?: AdminIdentity; }
interface AdminRow extends RowDataPacket { open_id: string | null; }

export class AuthConfigurationError extends Error { constructor() { super('Auth configuration unavailable'); } }
class ForbiddenIdentityError extends Error { constructor() { super('Forbidden identity'); } }

function getOAuthConfig(): OAuthConfig {
  const projectId = process.env.MANUS_PROJECT_ID?.trim();
  const portalUrl = process.env.MANUS_OAUTH_PORTAL_URL?.trim();
  const apiUrl = process.env.MANUS_OAUTH_API_URL?.trim();
  const rawSecret = process.env.MANUS_JWT_SECRET;
  const adminEmail = process.env.BLOG_ADMIN_EMAIL?.trim();
  if (!projectId || !portalUrl || !apiUrl || !rawSecret || !adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new AuthConfigurationError();
  }
  try {
    if (new URL(portalUrl).protocol !== 'https:' || new URL(apiUrl).protocol !== 'https:') throw new Error('invalid');
  } catch {
    throw new AuthConfigurationError();
  }
  return { projectId, portalUrl, apiUrl: apiUrl.replace(/\/+$/, ''), secret: new TextEncoder().encode(rawSecret), adminEmail };
}

function keyFromSecret(secret: Uint8Array): Uint8Array { return secret; }

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

function oauthStateCookie(payload: { nonce: string; origin: string; expiresAt: number }, secret: Uint8Array): string {
  const packed = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(packed).digest('base64url');
  return `${packed}.${signature}`;
}

function verifyOAuthStateCookie(value: string | null, state: OAuthState, origin: string, secret: Uint8Array): boolean {
  if (!value || value.length > 2048) return false;
  const parts = value.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return false;
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  const supplied = Buffer.from(parts[1], 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { nonce?: unknown; origin?: unknown; expiresAt?: unknown };
    const callback = `${origin}${CALLBACK_PATH}`;
    const now = Math.floor(Date.now() / 1000);
    return payload.nonce === state.nonce && payload.origin === origin && typeof payload.expiresAt === 'number' && payload.expiresAt > now && payload.expiresAt <= now + OAUTH_TTL_SECONDS && state.redirectUri === callback;
  } catch { return false; }
}

/** Pure bounded state decoder; authenticity is provided separately by the nonce cookie signature. */
export function decodeOAuthState(value: unknown): OAuthState | null {
  if (typeof value !== 'string' || value.length < 16 || value.length > 4096 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as Record<string, unknown>;
    if (typeof parsed.redirectUri !== 'string' || parsed.redirectUri.length > 2048 || typeof parsed.nonce !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(parsed.nonce)) return null;
    return { redirectUri: parsed.redirectUri, nonce: parsed.nonce };
  } catch { return null; }
}

function getAdminEmail(config: OAuthConfig): string { return config.adminEmail.trim().toLocaleLowerCase('en-US'); }

async function isBoundAdmin(openId: string): Promise<boolean> {
  const [rows] = await getDbPool().execute<AdminRow[]>('SELECT open_id FROM cms_admin WHERE id = 1 LIMIT 1');
  return rows.length === 1 && rows[0].open_id === openId;
}

async function bindFirstAdmin(identity: ManusIdentity, config: OAuthConfig): Promise<void> {
  const connection = await acquireDbConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<AdminRow[]>('SELECT open_id FROM cms_admin WHERE id = 1 FOR UPDATE');
    if (rows.length !== 1) throw new AuthConfigurationError();
    const boundOpenId = rows[0].open_id;
    if (boundOpenId && boundOpenId !== identity.openId) throw new ForbiddenIdentityError();
    if (!boundOpenId) {
      await connection.execute('UPDATE cms_admin SET open_id = ?, email = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = 1 AND open_id IS NULL', [identity.openId, getAdminEmail(config)]);
    }
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch { /* keep failures generic */ }
    throw error;
  } finally {
    connection.release();
  }
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: SESSION_PATH,
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}
function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: 'none', path: SESSION_PATH });
}
function clearOAuthCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, { httpOnly: true, secure: true, sameSite: 'none', path: CALLBACK_PATH });
}

async function createSessionToken(identity: ManusIdentity, config: OAuthConfig): Promise<string> {
  return new SignJWT({ appId: config.projectId, openId: identity.openId, name: identity.name || 'Administrador' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(keyFromSecret(config.secret));
}

async function readSession(req: Request): Promise<ParsedSession | null> {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token || token.length > 8192) return null;
  try {
    const config = getOAuthConfig();
    const { payload, protectedHeader } = await jwtVerify(token, keyFromSecret(config.secret), { algorithms: ['HS256'] });
    if (protectedHeader.alg !== 'HS256' || payload.appId !== config.projectId || typeof payload.openId !== 'string' || !payload.openId.trim() || payload.openId.length > 255 || /[\u0000-\u001f\u007f]/.test(payload.openId) || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return { token, claims: payload as SessionClaims };
  } catch { return null; }
}

export async function readAdminIdentity(req: Request): Promise<AdminIdentity | null> {
  const session = await readSession(req);
  if (!session) return null;
  if (!(await isBoundAdmin(session.claims.openId))) return null;
  return { openId: session.claims.openId, expiresAt: session.claims.exp };
}

function sendError(res: Response, status: number, error: string, code: string): void {
  res.status(status).json({ error, code });
}

export const requireAdmin: RequestHandler = async (req: AdminRequest, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { getOAuthConfig(); }
  catch { sendError(res, 503, SAFE_ERRORS.unconfigured, 'unconfigured'); return; }

  const session = await readSession(req);
  if (!session) { sendError(res, 401, SAFE_ERRORS.unauthenticated, 'unauthorized'); return; }
  try {
    if (!(await isBoundAdmin(session.claims.openId))) { sendError(res, 403, SAFE_ERRORS.forbidden, 'forbidden'); return; }
    req.adminIdentity = { openId: session.claims.openId, expiresAt: session.claims.exp };
    next();
  } catch {
    // Do not expose driver errors or database URL/configuration.
    sendError(res, 503, SAFE_ERRORS.unconfigured, 'unavailable');
  }
};

function sessionHash(token: string): string { return createHash('sha256').update(token).digest('base64url'); }

async function createCsrfToken(session: ParsedSession, config: OAuthConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.min(session.claims.exp, now + CSRF_TTL_SECONDS);
  return new SignJWT({
    purpose: 'cms-csrf', appId: config.projectId, openId: session.claims.openId, sessionHash: sessionHash(session.token),
  }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt(now).setExpirationTime(exp).sign(keyFromSecret(config.secret));
}

export const requireCsrf: RequestHandler = async (req: AdminRequest, res: Response, next: NextFunction) => {
  if (!isAllowedOrigin(req.get('origin'))) { sendError(res, 403, SAFE_ERRORS.origin, 'origin_forbidden'); return; }
  const identity = req.adminIdentity ?? await readAdminIdentity(req);
  if (!identity) {
    const session = await readSession(req);
    sendError(res, session ? 403 : 401, session ? SAFE_ERRORS.forbidden : SAFE_ERRORS.unauthenticated, session ? 'forbidden' : 'unauthorized');
    return;
  }
  const session = await readSession(req);
  const supplied = req.get('x-csrf-token');
  if (!session || !supplied || supplied.length > 4096) { sendError(res, 403, SAFE_ERRORS.csrf, 'csrf_invalid'); return; }
  try {
    const config = getOAuthConfig();
    const { payload } = await jwtVerify(supplied, keyFromSecret(config.secret), { algorithms: ['HS256'] });
    if (payload.purpose !== 'cms-csrf' || payload.appId !== config.projectId || payload.openId !== identity.openId || payload.sessionHash !== sessionHash(session.token)) {
      sendError(res, 403, SAFE_ERRORS.csrf, 'csrf_invalid');
      return;
    }
    next();
  } catch {
    sendError(res, 403, SAFE_ERRORS.csrf, 'csrf_invalid');
  }
};

async function exchangeManusCode(code: string, redirectUri: string, config: OAuthConfig): Promise<ManusIdentity> {
  const base = config.apiUrl;
  const exchangeResponse = await fetch(`${base}/webdev.v1.WebDevAuthPublicService/ExchangeToken`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId: config.projectId, grantType: 'authorization_code', code, redirectUri }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!exchangeResponse.ok) throw new Error('OAuth exchange failed');
  const exchange = await exchangeResponse.json() as { accessToken?: unknown };
  if (typeof exchange.accessToken !== 'string' || !exchange.accessToken) throw new Error('OAuth exchange response invalid');
  const identityResponse = await fetch(`${base}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accessToken: exchange.accessToken }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!identityResponse.ok) throw new Error('OAuth identity lookup failed');
  const identity = await identityResponse.json() as { openId?: unknown; email?: unknown; name?: unknown };
  if (typeof identity.openId !== 'string' || !identity.openId.trim() || identity.openId.length > 255 || /[\u0000-\u001f\u007f]/.test(identity.openId) || typeof identity.email !== 'string' || !identity.email.trim() || identity.email.length > 320) {
    throw new Error('OAuth identity invalid');
  }
  return { openId: identity.openId, email: identity.email.trim(), ...(typeof identity.name === 'string' && identity.name.trim() ? { name: identity.name.trim().slice(0, 100) } : {}) };
}

export const authRouter = Router();
export const sessionRouter = Router();

const oauthCallbackUrl = (origin: string) => `${origin}${CALLBACK_PATH}`;

authRouter.get('/start', async (req: Request, res: Response) => {
  let config: OAuthConfig;
  try { config = getOAuthConfig(); }
  catch { sendError(res, 503, SAFE_ERRORS.unconfigured, 'unconfigured'); return; }
  const origin = allowedPublicOrigin(req.query.origin);
  if (!origin || (req.get('origin') && req.get('origin') !== origin)) { sendError(res, 403, SAFE_ERRORS.origin, 'origin_forbidden'); return; }
  const nonce = randomBytes(32).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + OAUTH_TTL_SECONDS;
  const redirectUri = oauthCallbackUrl(origin);
  const state = Buffer.from(JSON.stringify({ redirectUri, nonce })).toString('base64');
  res.cookie(OAUTH_STATE_COOKIE, oauthStateCookie({ nonce, origin, expiresAt }, config.secret), {
    httpOnly: true, secure: true, sameSite: 'none', path: CALLBACK_PATH, maxAge: OAUTH_TTL_SECONDS * 1000,
  });
  const portal = new URL('/app-auth', config.portalUrl);
  portal.searchParams.set('appId', config.projectId);
  portal.searchParams.set('redirectUri', redirectUri);
  portal.searchParams.set('state', state);
  portal.searchParams.set('responseType', 'code');
  res.redirect(302, portal.toString());
});

authRouter.get('/callback', async (req: Request, res: Response) => {
  let config: OAuthConfig;
  try { config = getOAuthConfig(); }
  catch { clearOAuthCookie(res); sendError(res, 503, SAFE_ERRORS.unconfigured, 'unconfigured'); return; }

  const state = decodeOAuthState(req.query.state);
  if (!state) { clearOAuthCookie(res); sendError(res, 400, SAFE_ERRORS.generic, 'oauth_state_invalid'); return; }
  let callback: URL;
  try { callback = new URL(state.redirectUri); } catch { clearOAuthCookie(res); sendError(res, 400, SAFE_ERRORS.generic, 'oauth_state_invalid'); return; }
  const origin = allowedPublicOrigin(callback.origin);
  if (!origin || callback.pathname !== CALLBACK_PATH || callback.search || callback.hash || state.redirectUri !== oauthCallbackUrl(origin)) {
    clearOAuthCookie(res); sendError(res, 400, SAFE_ERRORS.generic, 'oauth_state_invalid'); return;
  }
  const cookie = cookieValue(req, OAUTH_STATE_COOKIE);
  if (!verifyOAuthStateCookie(cookie, state, origin, config.secret)) {
    clearOAuthCookie(res); sendError(res, 400, SAFE_ERRORS.generic, 'oauth_state_invalid'); return;
  }
  clearOAuthCookie(res);
  if (typeof req.query.code !== 'string' || req.query.code.length < 1 || req.query.code.length > 4096 || req.query.error) {
    sendError(res, 400, SAFE_ERRORS.generic, 'oauth_exchange_failed'); return;
  }

  try {
    const identity = await exchangeManusCode(req.query.code, state.redirectUri, config);
    if (identity.email.toLocaleLowerCase('en-US') !== getAdminEmail(config)) {
      sendError(res, 403, SAFE_ERRORS.forbidden, 'forbidden'); return;
    }
    await bindFirstAdmin(identity, config);
    setSessionCookie(res, await createSessionToken(identity, config));
    res.redirect(302, `${origin}/admin`);
  } catch (error) {
    if (error instanceof ForbiddenIdentityError) { sendError(res, 403, SAFE_ERRORS.forbidden, 'forbidden'); return; }
    if (error instanceof AuthConfigurationError) { sendError(res, 503, SAFE_ERRORS.unconfigured, 'unconfigured'); return; }
    sendError(res, 503, SAFE_ERRORS.generic, 'oauth_unavailable');
  }
});

authRouter.post('/logout', requireAdmin, requireCsrf, (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.status(204).end();
});

sessionRouter.get('/session', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  let config: OAuthConfig;
  try { config = getOAuthConfig(); }
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
    if (rows[0].open_id !== auth.claims.openId) {
      const result: AdminSession = { authenticated: true, authorized: false, configured: true, reason: SAFE_ERRORS.forbidden };
      res.status(200).json(result); return;
    }
    const csrfToken = await createCsrfToken(auth, config);
    const result: AdminSession = { authenticated: true, authorized: true, configured: true, name: 'Administrador', csrfToken };
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json(result);
  } catch {
    const result: AdminSession = { authenticated: false, authorized: false, configured: false, reason: SAFE_ERRORS.unconfigured };
    res.status(503).json(result);
  }
});
