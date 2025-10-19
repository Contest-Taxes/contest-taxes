'use client';
import { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '@/lib/supabaseClient';

export default function AuthClient() {
  const [client, setClient] = useState<ReturnType<typeof getSupabase> | null>(null);

  

  useEffect(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log('SUPABASE_URL (prod)', url);
  console.log('HAS_ANON (prod)', !!anon);
  if (!url || !anon) {
    console.error('Env vars manquantes côté client. Vérifie Vercel → Environment Variables (Production/Preview).');
    return; // évite le crash
  }
  setClient(getSupabase());
}, []);

  if (!client) {
    return <main className="mx-auto max-w-md p-6">Chargement…</main>;
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Espace client</h1>
      <Auth supabaseClient={client} appearance={{ theme: ThemeSupa }} providers={[]} />
      <p className="mt-6 text-sm text-gray-500">Après connexion, rendez-vous sur /dashboard.</p>
    </main>
  );
}