'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

export default function DashboardClient() {
  const [email, setEmail] = useState<string | null>(null);
  const supabase = getSupabase();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [supabase]);

  if (!email) {
    return (
      <main className="max-w-2xl">
        Veuillez vous connecter depuis <a className="underline" href="/auth">/auth</a>.
      </main>
    );
  }

  return (
    <main className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Bonjour {email}</h1>
      <p className="mt-2 text-gray-600">
        Ici vous pourrez enregistrer vos propriétés et importer vos comparables.
      </p>
    </main>
  );
}