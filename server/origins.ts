const projectOrigins = [
  'https://8328-ixpc6054lxmqu3tlr5suw-42b896b4.us5.manus.computer',
  'https://showbrq-pcnpfnwu.manus.space',
];

/** Public origins come from project receipts, not a proxied request's Host. */
export function getAllowedOrigins(): string[] {
  const configured = (process.env.CMS_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  return [...new Set([...projectOrigins, ...configured])].filter(value => {
    try { const url = new URL(value); return url.protocol === 'https:' && url.origin === value; } catch { return false; }
  });
}

export function allowedPublicOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return getAllowedOrigins().includes(value) ? value : null;
}

const configuredOrigin=process.env.PUBLIC_SITE_ORIGIN;
export const publishedOrigin = configuredOrigin && /^https:\/\/[^/]+$/.test(configuredOrigin) ? configuredOrigin : process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL ? `http://localhost:${process.env.PORT||3000}` : 'https://showbrq-pcnpfnwu.manus.space';
