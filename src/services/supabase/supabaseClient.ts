import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey &&
    supabaseAnonKey.trim() !== ''
  );
};

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.info('Connected to Supabase client.');
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
} else {
  console.info('Supabase credentials not detected in .env.');
}

export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

export { supabase };
