'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { t } from '@/lib/i18n/textes';

// Direction « affirmée » (planche du 2026-10-18) : barre d'encre sombre, mot-symbole
// blanc et rouge clair, pastilles de navigation pâles.
export default function NavBar() {
  const pathname = usePathname();
  const { langue, changer } = useLangue();
  const T = t(langue);
  const links = [
    { href: '/', label: T.nav.analyse },
    { href: '/mission', label: T.nav.mission },
    { href: '/about', label: T.nav.about },
    { href: '/contact', label: T.nav.contact },
  ];
  const autre = langue === 'fr' ? 'en' : 'fr';
  return (
    <header className="sticky top-0 z-40 bg-ct-encre text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label={T.nav.accueil}>
          <Image src="/logo-icone.png" alt="" width={55} height={45} priority className="h-10 w-auto sm:h-11" />
          <span className="whitespace-nowrap text-3xl font-bold tracking-tight">
            <span className="text-white">Contest-</span><span className="text-[#e2574f]">Taxes</span>
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
                className={`whitespace-nowrap rounded-full px-3.5 py-2 transition-colors ${
                  actif ? 'bg-white/12 text-white' : 'text-[#c9cfcb] hover:bg-white/10 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/auth"
            className="ml-2 whitespace-nowrap rounded-full border border-white/35 px-3.5 py-2 text-white transition-colors hover:border-white hover:bg-white/10"
          >
            {T.nav.espace}
          </Link>
          <button
            type="button"
            onClick={() => changer(autre)}
            lang={autre}
            aria-label={T.nav.langue}
            className="ml-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#c9cfcb] transition-colors hover:bg-white/10 hover:text-white"
          >
            {autre === 'en' ? 'EN' : 'FR'}
          </button>
        </nav>
      </div>
    </header>
  );
}
