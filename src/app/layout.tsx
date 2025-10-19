import type { Metadata } from 'next';
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
            © 2025 Contest-Taxes — Tous droits réservés
          </div>
        </footer>
      </body>
    </html>
  );
}
