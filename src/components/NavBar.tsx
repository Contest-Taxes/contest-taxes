'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Pré-tri' },
  { href: '/about', label: 'Qui sommes-nous' },
  { href: '/contact', label: 'Nous joindre' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-ct-ligne bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Contest-Taxes, accueil">
          <Image src="/logo-icone.png" alt="" width={44} height={34} priority className="h-9 w-auto sm:h-10" />
          <span className="whitespace-nowrap text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="text-ct-encre">Contest-</span><span className="text-ct-rouge">Taxes</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm font-medium">
          {links.map((l) => {
            const actif = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                  actif ? 'bg-ct-vert-pale text-ct-vert-fonce' : 'text-ct-gris hover:bg-gray-100 hover:text-ct-encre'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/auth"
            className="ml-2 whitespace-nowrap rounded-full border border-ct-ligne px-3 py-1.5 text-ct-gris transition-colors hover:border-ct-encre hover:text-ct-encre"
          >
            Espace client
          </Link>
        </nav>
      </div>
    </header>
  );
}
