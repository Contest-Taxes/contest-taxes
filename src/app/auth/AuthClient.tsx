'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '@/lib/supabaseClient';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { t } from '@/lib/i18n/textes';

// Inscription et connexion (Supabase Auth, courriel + mot de passe). Le
// paramètre « next » ramène l'usager où il allait : « Ouvrir un dossier »
// depuis l'analyse préliminaire passe par ici avec l'adresse de l'immeuble.

const FR = {
  variables: {
    sign_in: {
      email_label: 'Courriel', password_label: 'Mot de passe',
      email_input_placeholder: 'vous@exemple.com', password_input_placeholder: 'Votre mot de passe',
      button_label: 'Se connecter', loading_button_label: 'Connexion…',
      link_text: 'Vous avez déjà un compte ? Connectez-vous',
    },
    sign_up: {
      email_label: 'Courriel', password_label: 'Mot de passe',
      email_input_placeholder: 'vous@exemple.com', password_input_placeholder: 'Choisissez un mot de passe (6 caractères ou plus)',
      button_label: 'Créer mon compte', loading_button_label: 'Création…',
      link_text: 'Pas encore de compte ? Créez-le ici',
      confirmation_text: 'Vérifiez votre boîte de courriel : un lien de confirmation vous y attend.',
    },
    forgotten_password: {
      email_label: 'Courriel', email_input_placeholder: 'vous@exemple.com',
      button_label: 'Envoyer le lien de réinitialisation', loading_button_label: 'Envoi…',
      link_text: 'Mot de passe oublié ?', confirmation_text: 'Vérifiez votre boîte de courriel.',
    },
    update_password: {
      password_label: 'Nouveau mot de passe', password_input_placeholder: 'Nouveau mot de passe',
      button_label: 'Enregistrer', loading_button_label: 'Enregistrement…',
      confirmation_text: 'Mot de passe mis à jour.',
    },
  },
};

function cheminSur(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export default function AuthClient() {
  const { langue } = useLangue();
  const T = t(langue).auth;
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-6">{T.chargement}</main>}>
      <Formulaire />
    </Suspense>
  );
}

function Formulaire() {
  const { langue } = useLangue();
  const T = t(langue).auth;
  const router = useRouter();
  const params = useSearchParams();
  const next = cheminSur(params.get('next'));
  const [client, setClient] = useState<ReturnType<typeof getSupabase> | null>(null);
  const [indisponible, setIndisponible] = useState(false);
  const [origine, setOrigine] = useState('');

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setIndisponible(true);
      return;
    }
    const sb = getSupabase();
    setClient(sb);
    setOrigine(window.location.origin);
    sb.auth.getSession().then(({ data }) => { if (data.session) router.replace(next); });
    const { data: ecoute } = sb.auth.onAuthStateChange((evenement, session) => {
      if (session && (evenement === 'SIGNED_IN' || evenement === 'INITIAL_SESSION')) router.replace(next);
    });
    return () => ecoute.subscription.unsubscribe();
  }, [router, next]);

  if (indisponible) {
    return <main className="mx-auto max-w-md p-6">{T.indisponible} <a className="underline" href="/contact">{t(langue).nav.contact}</a>.</main>;
  }
  if (!client) return <main className="mx-auto max-w-md p-6">{T.chargement}</main>;

  return (
    <main className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold tracking-tight">{T.titre}</h1>
      <p className="mt-3 text-ct-gris">{T.intro}</p>
      <div className="mt-6 rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
        <Auth
          supabaseClient={client}
          view="sign_in"
          providers={[]}
          magicLink={false}
          localization={langue === 'fr' ? FR : undefined}
          redirectTo={origine ? `${origine}/auth?next=${encodeURIComponent(next)}` : undefined}
          appearance={{
            theme: ThemeSupa,
            variables: { default: { colors: { brand: '#367b3a', brandAccent: '#2a6130' }, radii: { borderRadiusButton: '12px', inputBorderRadius: '12px' } } },
          }}
        />
      </div>
      <p className="mt-4 text-xs text-ct-gris">{T.confirmation}</p>
    </main>
  );
}
