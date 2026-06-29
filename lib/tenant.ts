/** Cookie name matches Keyforge `registeredAppName` (also used by API routes). */
export const REGISTERED_APP_COOKIE = 'registeredAppName';

const SESSION_TENANT_KEY = 'kf_active_tenant';

/** First path segments that are app routes, not tenant ids. */
const RESERVED_FIRST_SEGMENTS = new Set(
  [
    'login',
    'oauth',
    'api',
    '_next',
    'oci-policy-analysis',
    'oci-policy-risk-management',
  ].map((s) => s.toLowerCase())
);

/**
 * Reads tenant id from the first URL segment, e.g. `/KFPRODOCI` → `KFPRODOCI`.
 * Returns null for `/login`, `/oci-policy-analysis`, etc.
 */
export function parseTenantFromPathname(pathname: string): string | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return null;
  if (RESERVED_FIRST_SEGMENTS.has(segment.toLowerCase())) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null;
  return segment;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = `${name}=`;
  for (const part of document.cookie.split(';')) {
    let c = part;
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
  const encoded = encodeURIComponent(value);
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `${name}=${encoded};expires=${expires.toUTCString()};path=/;samesite=strict${isSecure ? ';secure' : ''}`;
}

function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;secure;`;
}

export function getActiveTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromSession = sessionStorage.getItem(SESSION_TENANT_KEY)?.trim();
    if (fromSession) return fromSession;
    return readCookie(REGISTERED_APP_COOKIE)?.trim() || null;
  } catch {
    return readCookie(REGISTERED_APP_COOKIE)?.trim() || null;
  }
}

export function setActiveTenantId(tenantId: string): void {
  if (typeof window === 'undefined') return;
  const value = tenantId.trim();
  if (!value) return;
  try {
    sessionStorage.setItem(SESSION_TENANT_KEY, value);
  } catch {
    /* ignore */
  }
  writeCookie(REGISTERED_APP_COOKIE, value);
}

export function clearActiveTenantId(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_TENANT_KEY);
  } catch {
    /* ignore */
  }
  removeCookie(REGISTERED_APP_COOKIE);
}

export function hasActiveTenant(): boolean {
  return !!getActiveTenantId();
}

/** True when using standard /login flow without tenant in the URL. */
export function isStandardLoginPath(pathname: string): boolean {
  const normalized = pathname.split('?')[0].replace(/\/$/, '') || '/';
  return normalized === '/login';
}
