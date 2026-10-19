import type { Metadata } from 'next';
import { Fraunces, Geist } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import './globals.css';
import NavBar from '@/components/NavBar';
import { LangueProvider } from '@/lib/i18n/LangueProvider';
import { langueServeur } from '@/lib/i18n/serveur';
import { t } from '@/lib/i18n/textes';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', weight: 'variable', axes: ['opsz'] });

export async function generateMetadata(): Promise<Metadata> {
  const langue = await langueServeur();
  return {
    title: 'Contest-Taxes',
    description:
      langue === 'fr'
        ? 'Votre nouvelle évaluation foncière semble-t-elle hors norme? Analyse préliminaire gratuite à partir de votre adresse.'
        : 'Does your new property assessment look out of line? Free preliminary analysis from your address.',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const langue = await langueServeur();
  const T = t(langue);
  return (
    <html lang={langue} className={`${geist.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        <LangueProvider initiale={langue}>
          <NavBar />
          <main>{children}</main>
          <footer className="mt-20 bg-ct-encre text-ct-clair">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm">
              <div className="flex items-center gap-2">
                <Image src="/logo-icone.png" alt="" width={28} height={22} className="h-6 w-auto" />
                <span>© {new Date().getFullYear()} Contest-Taxes, {T.pied.droits.toLowerCase()}</span>
              </div>
              <nav className="flex flex-wrap gap-5">
                <Link href="/mission" className="hover:text-white">{T.nav.mission}</Link>
                <Link href="/about" className="hover:text-white">{T.nav.about}</Link>
                <Link href="/contact" className="hover:text-white">{T.nav.contact}</Link>
                <a href="mailto:contact@contest-taxes.ca" className="hover:text-white">contact@contest-taxes.ca</a>
              </nav>
            </div>
          </footer>
        </LangueProvider>
      </body>
    </html>
  );
}
