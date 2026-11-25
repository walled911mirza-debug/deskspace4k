import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const WALLPAPERS_TABLE = 'wallpapers';
export const WALLPAPERS_BUCKET = 'wallpapers';

function readSafeEnvVar(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  try {
    const env = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
    const raw = env?.[key];
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
    return trimmed;
  } catch {
    return '';
  }
}

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const rawSupabaseUrl = readSafeEnvVar('VITE_SUPABASE_URL');
const rawSupabaseAnonKey = readSafeEnvVar('VITE_SUPABASE_ANON_KEY');

const hasValidUrl = isValidHttpUrl(rawSupabaseUrl);
const hasValidKey = rawSupabaseAnonKey.length > 0;

let clientInstance: SupabaseClient | null = null;
let initError: string | null = null;

if (hasValidUrl && hasValidKey) {
  try {
    clientInstance = createClient(rawSupabaseUrl, rawSupabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err: any) {
    clientInstance = null;
    initError = err?.message || 'Failed to initialize Supabase client.';
    console.warn('[DeskSpace4K] Supabase initialization failed gracefully:', initError);
  }
} else {
  const missing: string[] = [];
  if (!rawSupabaseUrl) missing.push('VITE_SUPABASE_URL');
  else if (!hasValidUrl) missing.push('valid VITE_SUPABASE_URL (http/https)');
  if (!hasValidKey) missing.push('VITE_SUPABASE_ANON_KEY');

  initError = `Supabase environment not configured (${missing.join(', ')} missing). Running in safe local storage fallback mode.`;
  if (typeof console !== 'undefined') {
    console.info('[DeskSpace4K]', initError);
  }
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
    urlPresent: Boolean(rawSupabaseUrl),
    urlValid: hasValidUrl,
    keyPresent: hasValidKey,
    error: initError,
  };
}
