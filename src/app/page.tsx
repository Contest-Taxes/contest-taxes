import { unstable_cache } from 'next/cache';
import PretriForm from '@/components/PretriForm';
import { getSupabaseServeur } from '@/lib/supabaseServer';
import type { CouvertureSql } from '@/lib/pretri/types';
import { langueServeur } from '@/lib/i18n/serveur';
import { t } from '@/lib/i18n/textes';

// Villes couvertes : lues dans la base (une ligne par table chargée), gardées
// en cache une heure. La page elle-même se rend à chaque requête, dans la
// langue du témoin.
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

function Carte({ titre, children, icone, langue }: { titre: string; children: React.ReactNode; icone: React.ReactNode; langue: string }) {
  return (
    <div className="rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ct-vert-pale text-ct-vert-fonce" aria-hidden="true">
          {icone}
        </span>
        <h2 className="font-semibold">{titre}</h2>
      </div>
      <p className="mt-3 text-justify text-sm leading-relaxed text-ct-gris hyphens-auto" lang={langue}>{children}</p>
    </div>
  );
}

const Loupe = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const Oeil = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /><path d="m3 3 18 18" />
  </svg>
);
const Fleche = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
  </svg>
);

export default async function Home() {
  const langue = await langueServeur();
  const T = t(langue).accueil;
  const couverture = await chargerCouverture();
  const libelleRole = (c: CouvertureSql) => (c.role_libelle ? `${T.role} ${c.role_libelle}` : `${T.millesime} ${c.millesime}`);
  const pleines = couverture.filter((c) => !c.apercu);
  const apercus = couverture.filter((c) => c.apercu);
  return (
    <div>
      <section className="fond-accueil -mt-8 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] pb-6 pt-12 sm:pt-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap gap-2">
            {(couverture.length ? couverture : [{ ville: '66023', nom: 'Montréal', millesime: 2026, role_libelle: '2026-2027-2028', apercu: false, note: null }]).map((c) => (
              <p key={c.ville} className="inline-flex items-center gap-2 rounded-full border border-ct-ligne bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-ct-gris">
                <span className={`h-1.5 w-1.5 rounded-full ${c.apercu ? 'bg-amber-500' : 'bg-ct-vert'}`} aria-hidden="true" />
                {c.nom} · {c.apercu ? `${T.apercu}, ` : ''}{libelleRole(c)}
              </p>
            ))}
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{T.titre}</h1>
          <p className="mt-4 text-justify text-lg leading-relaxed text-ct-gris hyphens-auto" lang={langue}>{T.intro}</p>
          <p className="mt-3 text-sm text-ct-gris">
            {T.couvre}{' '}
            {pleines.length
              ? pleines.map((c, i) => (
                  <span key={c.ville}>
                    {i > 0 ? ', ' : ''}<strong>{c.nom}</strong>, {libelleRole(c)}
                  </span>
                ))
              : <><strong>Montréal</strong>, {T.role} 2026-2027-2028</>}
            {apercus.length > 0 && (
              <>
                {' '}{T.etApercu}{' '}
                {apercus.map((c, i) => (
                  <span key={c.ville}>
                    {i > 0 ? ', ' : ''}<strong>{c.nom}</strong> ({libelleRole(c)}, {T.apercuNote})
                  </span>
                ))}
              </>
            )}
            {T.suite}
          </p>
          <div className="mt-6">
            <PretriForm />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-5 sm:grid-cols-3">
        <Carte titre={T.carte1t} icone={Loupe} langue={langue}>{T.carte1}</Carte>
        <Carte titre={T.carte2t} icone={Oeil} langue={langue}>{T.carte2}</Carte>
        <Carte titre={T.carte3t} icone={Fleche} langue={langue}>{T.carte3}</Carte>
      </section>

      <section className="mt-12 text-sm leading-relaxed text-ct-gris">
        <p>{T.source}</p>
      </section>
    </div>
  );
}
