'use client';
import { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '@/lib/supabaseClient';

export default function AuthClient() {
  const [client, setClient] = useState<ReturnType<typeof getSupabase> | null>(null);
  const [indisponible, setIndisponible] = useState(false);

  useEffect(() => {
    // Le client Supabase n'est créé qu'une fois monté côté navigateur : les
    // variables NEXT_PUBLIC_* sont figées dans le bundle au moment du build.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setIndisponible(true);
      return;
    }
    setClient(getSupabase());
  }, []);

  if (indisponible) {
    return (
      <main className="mx-auto max-w-md p-6">
        L’espace client est temporairement indisponible. Réessayez plus tard ou
        écrivez-nous via la page <a className="underline" href="/contact">Nous joindre</a>.
      </main>
    );
  }

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