import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import './globals.css';
import NavBar from '@/components/NavBar';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Contest-Taxes',
  description:
    'Votre nouvelle évaluation foncière semble-t-elle hors norme? Pré-tri gratuit à partir de votre adresse, à Montréal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={geist.variable}>
      <body className="min-h-screen bg-background text-foreground">
        <NavBar />
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <footer className="mt-20 border-t border-ct-ligne bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-ct-gris">
            <div className="flex items-center gap-2">
              <Image src="/logo-icone.png" alt="" width={28} height={22} className="h-6 w-auto" />
              <span>© {new Date().getFullYear()} Contest-Taxes — Tous droits réservés</span>
            </div>
            <nav className="flex gap-5">
              <Link href="/about" className="hover:text-ct-encre">Qui sommes-nous</Link>
              <Link href="/contact" className="hover:text-ct-encre">Nous joindre</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
