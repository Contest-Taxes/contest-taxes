import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Client Supabase du serveur, avec la clé de service. Ce module ne doit jamais
// être importé par un composant client : `server-only` fait échouer le build si
// cela arrive. La clé de service contourne les règles d'accès des tables ; les
// tables du pré-tri ne sont lisibles que par elle.
let client: SupabaseClient | null = null;

export function getSupabaseServeur(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !cle) {
      throw new Error(
        'Variables serveur absentes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY ' +
        'doivent exister dans .env.local et dans Vercel.'
      );
    }
    client = createClient(url, cle, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
