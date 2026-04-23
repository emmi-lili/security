import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// We want the app to keep working even without Supabase configured (pure-offline
// demo mode). When env vars are missing, we export `null` and the data layer
// falls back to localStorage-only behaviour.
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // We don't use Supabase Auth in this project — login is handled against
        // our own `users` table via the `verify_user` RPC. Disable auto session
        // persistence so the SDK doesn't hit /auth/v1/user needlessly.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    })
  : null;

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. ' +
      'App will run in localStorage-only mode.'
  );
}
