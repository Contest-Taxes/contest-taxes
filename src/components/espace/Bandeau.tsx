import Link from 'next/link';
import type { ReactNode } from 'react';

// Bandeau d'encre des pages de l'espace client (planches du 2026-10-19) :
// lien de retour ou surtitre, titre en Fraunces, sous-titre, actions à droite.
// Pleine largeur ; le contenu suit la largeur du site (80rem).
export default function Bandeau({ surtitre, titre, sousTitre, retour, actions }: {
  surtitre?: string;
  titre: string;
  sousTitre?: ReactNode;
  retour?: { href: string; libelle: string };
  actions?: ReactNode;
}) {
  return (
    <section className="bg-ct-encre pb-9 pt-7 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-6">
        <div className="flex min-w-0 flex-col gap-2">
          {retour && <Link href={retour.href} className="text-sm text-[#c9cfcb] hover:text-white">{retour.libelle}</Link>}
          {surtitre && <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#9fd3a3]">{surtitre}</p>}
          <h1 className="font-display text-[34px] font-medium leading-[1.1] sm:text-[44px]">{titre}</h1>
          {sousTitre && <p className="text-[#c9cfcb]">{sousTitre}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 text-sm">{actions}</div>}
      </div>
    </section>
  );
}
