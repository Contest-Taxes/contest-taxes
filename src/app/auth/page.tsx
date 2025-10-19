'use client';
export const dynamic = 'force-dynamic';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const supabase = getSupabase();
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Espace client</h1>
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
      <p className="mt-6 text-sm text-gray-500">Après connexion, rendez-vous sur /dashboard.</p>
    </main>
  );
}