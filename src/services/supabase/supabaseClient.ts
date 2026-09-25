import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidHttpUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const hasValidCredentials = Boolean(
  supabaseUrl &&
  supabaseUrl.trim() !== '' &&
  supabaseUrl.trim() !== 'VITE_SUPABASE_URL' &&
  isValidHttpUrl(supabaseUrl.trim()) &&
  supabaseAnonKey &&
  supabaseAnonKey.trim() !== '' &&
  supabaseAnonKey.trim() !== 'VITE_SUPABASE_ANON_KEY'
);

let supabase: SupabaseClient | null = null;

if (hasValidCredentials) {
  try {
    supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.info('Connected to Supabase client.');
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabase = null;
  }
} else {
  console.warn('Supabase credentials not detected or invalid in environment.');
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabase);
};

export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

export { supabase };
