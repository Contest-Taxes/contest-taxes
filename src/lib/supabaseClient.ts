import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      throw new Error(
        'Variables Supabase absentes du bundle : vérifier NEXT_PUBLIC_SUPABASE_URL ' +
        'et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel (portée Production incluse).'
      );
    }
    client = createClient(url, anon);
  }
  return client;
}