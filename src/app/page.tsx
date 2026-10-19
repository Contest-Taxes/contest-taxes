import { unstable_cache } from 'next/cache';
import PretriForm from '@/components/PretriForm';
import { getSupabaseServeur } from '@/lib/supabaseServer';
import type { CouvertureSql, ExempleSql } from '@/lib/pretri/types';
import { langueServeur } from '@/lib/i18n/serveur';
import { t } from '@/lib/i18n/textes';

// Page d'accueil, direction « affirmée » (planche retouchée par Guillaume le
// 2026-10-18) : bandeau d'encre avec le titre en Fraunces, la barre de recherche
// et un aperçu chiffré ; verdict en carte blanche à liseré ; cartes numérotées.
// Villes couvertes : lues dans la base, gardées en cache une heure.
const chargerCouverture = unstable_cache(
  async (): Promise<CouvertureSql[]> => {
    try {
      const { data, error } = await getSupabaseServeur().rpc('pretri_couverture');
      if (error || !Array.isArray(data)) return [];
      return data as CouvertureSql[];
    } catch {
      return [];
    }
  },
  ['pretri_couverture'],
  { revalidate: 3600 },
);

// Exemple de la carte « En une seconde » : un immeuble de Montréal tiré au
// hasard à chaque ouverture de la page (maisons et plex dans la norme).
async function chargerExemple(): Promise<ExempleSql | null> {
  try {
    const { data, error } = await getSupabaseServeur().rpc('pretri_exemple', { p_ville: '66023' });
    if (error || !data) return null;
    return data as ExempleSql;
  } catch {
    return null;
  }
}

function Carte({ numero, titre, children, langue }: { numero: string; titre: string; children: React.ReactNode; langue: string }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-ct-fond p-7">
      <p className="font-display text-[40px] leading-none text-ct-vert" aria-hidden="true">{numero}</p>
      <h2 className="text-lg font-semibold">{titre}</h2>
      <p className="text-justify text-sm leading-relaxed text-ct-gris hyphens-auto" lang={langue}>{children}</p>
    </div>
  );
}

export default async function Home() {
  const langue = await langueServeur();
  const T = t(langue).accueil;
  const [couverture, exemple] = await Promise.all([chargerCouverture(), chargerExemple()]);
  return (
    <div>
      <PretriForm couverture={couverture} exemple={exemple} />
      <div className="conteneur">
      <section className="grid gap-6 sm:grid-cols-3">
        <Carte numero="01" titre={T.carte1t} langue={langue}>{T.carte1}</Carte>
        <Carte numero="02" titre={T.carte2t} langue={langue}>{T.carte2}</Carte>
        <Carte numero="03" titre={T.carte3t} langue={langue}>{T.carte3}</Carte>
      </section>

      <section className="mt-10 text-sm leading-relaxed text-ct-gris">
        <p>{T.source}</p>
      </section>
      </div>
    </div>
  );
}
