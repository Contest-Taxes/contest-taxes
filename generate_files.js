import fs from "fs";
import path from "path";

const files = {
  "src/app/layout.tsx": `import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Contest-Taxes',
  description: 'Analyse et contestation de rôles fonciers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-gray-900">
        <NavBar />
        <main className="mx-auto max-w-5xl p-6">{children}</main>
        <footer className="mt-16 border-t py-8 text-sm text-gray-500">
          <div className="mx-auto max-w-5xl px-6">
            © ${new Date().getFullYear()} Contest-Taxes — Tous droits réservés
          </div>
        </footer>
      </body>
    </html>
  );
}
`,

  "src/components/NavBar.tsx": `'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Accueil' },
  { href: '/about', label: 'Qui sommes-nous' },
  { href: '/contact', label: 'Nous joindre' },
  { href: '/auth', label: 'Espace client' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-xl font-semibold tracking-tight">Contest-Taxes</Link>
        <nav className="flex items-center gap-6 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={\`\${pathname === l.href ? 'text-black' : 'text-gray-600'} hover:text-black\`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
`,

  "src/app/page.tsx": `export default function Home() {
  return (
    <section>
      <h1 className="text-4xl font-bold">Contest-Taxes</h1>
      <p className="mt-3 max-w-2xl">
        Outil d’analyse des rôles fonciers de la Ville de Montréal pour aider les propriétaires à comprendre et, au besoin, contester leur évaluation.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href="/about" className="rounded-2xl border p-5 hover:shadow">Qui sommes-nous →</a>
        <a href="/auth" className="rounded-2xl border p-5 hover:shadow">Accéder à l’espace client →</a>
      </div>
    </section>
  );
}
`,

  "src/app/about/page.tsx": `export default function Page() {
  return (
    <article className="prose prose-neutral max-w-none">
      <h1>Qui sommes-nous</h1>
      <p>
        Contest-Taxes est un service d’analyse qui met en forme les comparables fournis par la Ville
        pour produire un rapport clair et exploitable lors d’une demande de révision.
      </p>
      <h2>Notre approche</h2>
      <ul>
        <li>Transparence méthodologique</li>
        <li>Automatisation là où ça compte</li>
        <li>Respect des limites légales (aucun avis d’évaluateur agréé)</li>
      </ul>
    </article>
  );
}
`,

  "src/app/contact/page.tsx": `export default function Page() {
  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-semibold">Nous joindre</h1>
      <p className="mt-3 text-gray-600">Écrivez-nous et on vous répond rapidement.</p>
      <form className="mt-6 grid gap-4" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-1">
          <span>Votre courriel</span>
          <input type="email" required className="rounded-md border p-2" placeholder="vous@exemple.com" />
        </label>
        <label className="grid gap-1">
          <span>Message</span>
          <textarea required className="min-h-[120px] rounded-md border p-2" placeholder="Votre message…" />
        </label>
        <button type="submit" className="rounded-md bg-black px-4 py-2 font-medium text-white hover:opacity-90">
          Envoyer
        </button>
      </form>
    </section>
  );
}
`,

  "src/lib/supabaseClient.ts": `import { createClient } from '@supabase/supabase-js';

// Renseigne ces variables dans .env.local et dans Vercel → Environment Variables
// NEXT_PUBLIC_SUPABASE_URL=...
// NEXT_PUBLIC_SUPABASE_ANON_KEY=...

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
`,

  "src/app/auth/page.tsx": `'use client';
import { supabase } from '@/lib/supabaseClient';
import { Auth, ThemeSupa } from '@supabase/auth-ui-react';

export default function AuthPage() {
  return (
    <main className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Espace client</h1>
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
      <p className="mt-6 text-sm text-gray-500">Après connexion, rendez-vous sur /dashboard.</p>
    </main>
  );
}
`,

  "src/app/dashboard/page.tsx": `'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (!email) return <main className="max-w-2xl">Veuillez vous connecter depuis <a className="underline" href="/auth">/auth</a>.</main>;

  return (
    <main className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Bonjour {email}</h1>
      <p className="mt-2 text-gray-600">Ici vous pourrez enregistrer vos propriétés et importer vos comparables.</p>
    </main>
  );
}
`,
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
  console.log("✅ Wrote", relPath);
}
