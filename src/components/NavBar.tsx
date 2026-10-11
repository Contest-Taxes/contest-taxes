'use client';
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
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="whitespace-nowrap text-xl font-semibold tracking-tight">Contest-Taxes</Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap ${pathname === l.href ? 'text-black' : 'text-gray-600'} hover:text-black`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
