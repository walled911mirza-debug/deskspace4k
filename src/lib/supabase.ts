import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const WALLPAPERS_TABLE = 'wallpapers';
export const WALLPAPERS_BUCKET = 'wallpapers';

interface RuntimeEnvShape {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

declare global {
  interface Window {
    __DESKSPACE_ENV__?: RuntimeEnvShape;
  }
}

export type SupabaseEnvSource = 'import.meta.env' | 'window.__DESKSPACE_ENV__' | 'process.env' | 'none';
export type SupabaseKeyFormat = 'publishable' | 'jwt' | 'other' | 'missing' | 'malformed';

const PLACEHOLDER_VALUE_PATTERNS = [
  /^your[_-]/i,
  /^my[_-]/i,
  /^placeholder/i,
  /^replace[_-]/i,
  /^<[^>]+>$/,
  /^changeme$/i,
];

function sanitizeEnvValue(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  // Strip accidental surrounding quotes or backticks (e.g. from .env copy-paste)
  while (
    cleaned.length >= 2 &&
    ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
      (cleaned.startsWith('`') && cleaned.endsWith('`')))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Also strip escaped surrounding quotes (e.g. \"https://...\")
  if (cleaned.length >= 4 && cleaned.startsWith('\\"') && cleaned.endsWith('\\"')) {
    cleaned = cleaned.slice(2, -2).trim();
  }

  const lower = cleaned.toLowerCase();
  if (!cleaned || lower === 'undefined' || lower === 'null' || lower === 'none') {
    return '';
  }

  return cleaned;
}

function isPlaceholderValue(cleaned: string): boolean {
  return PLACEHOLDER_VALUE_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function readStaticViteUrl(): { raw: string; source: SupabaseEnvSource } {
  // Static literal access is required so Vite inlines import.meta.env.VITE_* at build/dev time
  try {
    const val = import.meta.env.VITE_SUPABASE_URL;
    if (sanitizeEnvValue(val)) {
      return { raw: String(val), source: 'import.meta.env' };
    }
  } catch {
    // ignore
  }
  try {
    const winVal = typeof window !== 'undefined' ? window.__DESKSPACE_ENV__?.VITE_SUPABASE_URL : undefined;
    if (sanitizeEnvValue(winVal)) {
      return { raw: String(winVal), source: 'window.__DESKSPACE_ENV__' };
    }
  } catch {
    // ignore
  }
  try {
    const procEnv = (globalThis as any)?.process?.env;
    const procVal = procEnv?.VITE_SUPABASE_URL;
    if (sanitizeEnvValue(procVal)) {
      return { raw: String(procVal), source: 'process.env' };
    }
  } catch {
    // ignore
  }
  return { raw: '', source: 'none' };
}

function readStaticViteAnonKey(): { raw: string; source: SupabaseEnvSource } {
  // Static literal access is required so Vite inlines import.meta.env.VITE_* at build/dev time
  try {
    const val = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (sanitizeEnvValue(val)) {
      return { raw: String(val), source: 'import.meta.env' };
    }
  } catch {
    // ignore
  }
  try {
    const winVal = typeof window !== 'undefined' ? window.__DESKSPACE_ENV__?.VITE_SUPABASE_ANON_KEY : undefined;
    if (sanitizeEnvValue(winVal)) {
      return { raw: String(winVal), source: 'window.__DESKSPACE_ENV__' };
    }
  } catch {
    // ignore
  }
  try {
    const procEnv = (globalThis as any)?.process?.env;
    const procVal = procEnv?.VITE_SUPABASE_ANON_KEY;
    if (sanitizeEnvValue(procVal)) {
      return { raw: String(procVal), source: 'process.env' };
    }
  } catch {
    // ignore
  }
  return { raw: '', source: 'none' };
}

export function normalizeAndValidateSupabaseUrl(raw: unknown): {
  url: string;
  rawPresent: boolean;
  valid: boolean;
  reason?: string;
} {
  let cleaned = sanitizeEnvValue(raw);
  if (!cleaned) {
    return { url: '', rawPresent: false, valid: false, reason: 'VITE_SUPABASE_URL is empty or unset' };
  }

  // Handle accidental "VITE_SUPABASE_URL=https://..." pasted as value
  cleaned = cleaned.replace(/^(?:VITE_)?SUPABASE_URL\s*=\s*/i, '');
  cleaned = sanitizeEnvValue(cleaned);
  if (!cleaned) {
    return { url: '', rawPresent: false, valid: false, reason: 'VITE_SUPABASE_URL is empty after trimming' };
  }

  if (isPlaceholderValue(cleaned)) {
    return { url: '', rawPresent: true, valid: false, reason: 'VITE_SUPABASE_URL is still a placeholder value' };
  }

  // Remove accidental whitespace/newlines and normalize protocol-relative or bare hostnames
  cleaned = cleaned.replace(/[\r\n\t]+/g, '').trim();
  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`;
  } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(cleaned)) {
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(cleaned);
    cleaned = `${isLocal ? 'http' : 'https'}://${cleaned}`;
  }

  // Strip trailing slashes without imposing overly strict hostname regexes
  cleaned = cleaned.replace(/\/+$/, '');

  try {
    const parsed = new URL(cleaned);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const hasHost = Boolean(parsed.hostname && parsed.hostname.includes('.') || parsed.hostname === 'localhost');

    if (!isHttp) {
      return {
        url: cleaned,
        rawPresent: true,
        valid: false,
        reason: `Unsupported URL protocol "${parsed.protocol}" (expected https:// or http://)`,
      };
    }

    if (!parsed.hostname || !hasHost) {
      return {
        url: cleaned,
        rawPresent: true,
        valid: false,
        reason: 'URL hostname is missing or incomplete',
      };
    }

    // Standard URL parser accepts https://*.supabase.co, custom domains, and localhost URLs
    const normalized = `${parsed.origin}${parsed.pathname === '/' ? '' : parsed.pathname}`.replace(/\/+$/, '');
    return { url: normalized, rawPresent: true, valid: true };
  } catch {
    return {
      url: cleaned,
      rawPresent: true,
      valid: false,
      reason: 'Could not parse VITE_SUPABASE_URL as a valid URL (expected https://<project-ref>.supabase.co)',
    };
  }
}

export function validateSupabaseAnonKey(raw: unknown): {
  key: string;
  rawPresent: boolean;
  valid: boolean;
  keyFormat: SupabaseKeyFormat;
  reason?: string;
} {
  let cleaned = sanitizeEnvValue(raw);
  if (!cleaned) {
    return {
      key: '',
      rawPresent: false,
      valid: false,
      keyFormat: 'missing',
      reason: 'VITE_SUPABASE_ANON_KEY is empty or unset',
    };
  }

  // Handle accidental "VITE_SUPABASE_ANON_KEY=..." pasted as value
  cleaned = cleaned.replace(/^(?:VITE_)?SUPABASE_ANON_KEY\s*=\s*/i, '');
  cleaned = sanitizeEnvValue(cleaned);
  cleaned = cleaned.replace(/[\r\n]+/g, '').trim();

  if (!cleaned) {
    return {
      key: '',
      rawPresent: false,
      valid: false,
      keyFormat: 'missing',
      reason: 'VITE_SUPABASE_ANON_KEY is empty after trimming',
    };
  }

  if (isPlaceholderValue(cleaned)) {
    return {
      key: '',
      rawPresent: true,
      valid: false,
      keyFormat: 'malformed',
      reason: 'VITE_SUPABASE_ANON_KEY is still a placeholder value',
    };
  }

  if (/\s/.test(cleaned)) {
    return {
      key: cleaned,
      rawPresent: true,
      valid: false,
      keyFormat: 'malformed',
      reason: 'VITE_SUPABASE_ANON_KEY contains unexpected whitespace characters',
    };
  }

  if (cleaned.startsWith('sb_secret_')) {
    return {
      key: '',
      rawPresent: true,
      valid: false,
      keyFormat: 'malformed',
      reason: 'Service/secret key (sb_secret_*) detected; browser client requires a publishable (sb_publishable_*) or anon (eyJ*) key',
    };
  }

  // Accept Supabase publishable keys (sb_publishable_...)
  if (cleaned.startsWith('sb_publishable_')) {
    if (cleaned.length <= 'sb_publishable_'.length + 4) {
      return {
        key: cleaned,
        rawPresent: true,
        valid: false,
        keyFormat: 'malformed',
        reason: 'VITE_SUPABASE_ANON_KEY starting with sb_publishable_ appears truncated',
      };
    }
    return { key: cleaned, rawPresent: true, valid: true, keyFormat: 'publishable' };
  }

  // Accept legacy Supabase JWT anon keys (eyJ...)
  if (cleaned.startsWith('eyJ')) {
    const segments = cleaned.split('.');
    if (segments.length !== 3 || segments.some((s) => s.length === 0)) {
      return {
        key: cleaned,
        rawPresent: true,
        valid: false,
        keyFormat: 'malformed',
        reason: 'Legacy JWT anon key (eyJ*) is malformed (expected 3 dot-separated JWT segments)',
      };
    }
    return { key: cleaned, rawPresent: true, valid: true, keyFormat: 'jwt' };
  }

  // Fallback for any other valid non-JWT Supabase public key format without rejecting non-JWT keys
  if (cleaned.length < 16) {
    return {
      key: cleaned,
      rawPresent: true,
      valid: false,
      keyFormat: 'malformed',
      reason: 'VITE_SUPABASE_ANON_KEY is too short to be a valid Supabase key (expected sb_publishable_* or eyJ*)',
    };
  }

  return { key: cleaned, rawPresent: true, valid: true, keyFormat: 'other' };
}

const urlRead = readStaticViteUrl();
const keyRead = readStaticViteAnonKey();

const urlCheck = normalizeAndValidateSupabaseUrl(urlRead.raw);
const keyCheck = validateSupabaseAnonKey(keyRead.raw);

const normalizedSupabaseUrl = urlCheck.url;
const normalizedSupabaseAnonKey = keyCheck.key;

const hasValidUrl = urlCheck.valid;
const hasValidKey = keyCheck.valid;

let clientInstance: SupabaseClient | null = null;
let initError: string | null = null;

if (hasValidUrl && hasValidKey) {
  try {
    clientInstance = createClient(normalizedSupabaseUrl, normalizedSupabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err: any) {
    clientInstance = null;
    initError = err?.message || 'Failed to initialize Supabase client.';
  }
} else {
  const issues: string[] = [];
  if (!urlCheck.rawPresent) {
    issues.push('VITE_SUPABASE_URL missing');
  } else if (!hasValidUrl) {
    issues.push(`VITE_SUPABASE_URL malformed (${urlCheck.reason || 'invalid http/https URL'})`);
  }

  if (!keyCheck.rawPresent) {
    issues.push('VITE_SUPABASE_ANON_KEY missing');
  } else if (!hasValidKey) {
    issues.push(`VITE_SUPABASE_ANON_KEY malformed (${keyCheck.reason || 'invalid key'})`);
  }

  initError = `Supabase environment not configured: ${issues.join('; ')}. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (sb_publishable_* or eyJ* JWT) to enable cloud storage and database sync.`;
}

function isDevEnvironment(): boolean {
  try {
    return Boolean(import.meta.env.DEV);
  } catch {
    return false;
  }
}

export function logSupabaseDiagnostics(context: string = 'startup'): void {
  if (typeof console === 'undefined') return;

  const shouldLogSuccess = isDevEnvironment() || context.startsWith('admin');
  const keyPreview =
    keyCheck.valid && normalizedSupabaseAnonKey
      ? `${normalizedSupabaseAnonKey.slice(0, 14)}... (len=${normalizedSupabaseAnonKey.length})`
      : keyCheck.rawPresent
      ? `invalid (len=${normalizedSupabaseAnonKey.length})`
      : 'missing';

  if (clientInstance) {
    if (shouldLogSuccess) {
      console.info(`[DeskSpace4K][Supabase] Connected (${context})`, {
        url: normalizedSupabaseUrl,
        urlSource: urlRead.source,
        keyFormat: keyCheck.keyFormat,
        keySource: keyRead.source,
        keyPreview,
      });
    }
    return;
  }

  console.warn(`[DeskSpace4K][Supabase] Configuration check failed (${context}): ${initError}`, {
    VITE_SUPABASE_URL: urlCheck.valid ? `valid (${normalizedSupabaseUrl})` : urlCheck.reason || 'missing',
    urlSource: urlRead.source,
    VITE_SUPABASE_ANON_KEY: keyCheck.valid
      ? `valid (${keyCheck.keyFormat})`
      : keyCheck.reason || 'missing',
    keySource: keyRead.source,
    keyFormatDetected: keyCheck.keyFormat,
    keyPreview,
  });
}

// Log automatically in development or whenever configuration is missing/malformed
if (isDevEnvironment() || !clientInstance) {
  logSupabaseDiagnostics('startup');
}

export const supabase: SupabaseClient | null = clientInstance;
export const isSupabaseConfigured: boolean = Boolean(clientInstance);
export const supabaseConfigError: string | null = initError;

export function getSupabaseClient(): SupabaseClient | null {
  return clientInstance;
}

export function getSupabaseStatus() {
  return {
    configured: Boolean(clientInstance),
    urlPresent: urlCheck.rawPresent,
    urlValid: hasValidUrl,
    urlSource: urlRead.source,
    keyPresent: keyCheck.rawPresent,
    keyValid: hasValidKey,
    keyFormat: keyCheck.keyFormat,
    keySource: keyRead.source,
    error: initError,
  };
}
