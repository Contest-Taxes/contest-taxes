import PretriForm from '@/components/PretriForm';
import { getSupabaseServeur } from '@/lib/supabaseServer';
import type { CouvertureSql } from '@/lib/pretri/types';

// Villes couvertes : lues dans la base (une ligne par table chargée), rafraîchies à l'heure.
export const revalidate = 3600;

async function chargerCouverture(): Promise<CouvertureSql[]> {
  try {
    const { data, error } = await getSupabaseServeur().rpc('pretri_couverture');
    if (error || !Array.isArray(data)) return [];
    return data as CouvertureSql[];
  } catch {
    return [];
  }
}

function libelleRole(c: CouvertureSql) {
  return c.role_libelle ? `rôle ${c.role_libelle}` : `millésime ${c.millesime}`;
}

function Carte({ titre, children, icone }: { titre: string; children: React.ReactNode; icone: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ct-vert-pale text-ct-vert-fonce" aria-hidden="true">
          {icone}
        </span>
        <h2 className="font-semibold">{titre}</h2>
      </div>
      <p className="mt-3 text-justify text-sm leading-relaxed text-ct-gris hyphens-auto" lang="fr">{children}</p>
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
  const couverture = await chargerCouverture();
  const pleines = couverture.filter((c) => !c.apercu);
  const apercus = couverture.filter((c) => c.apercu);
  return (
    <div>
      {/* Pleine largeur : la section sort du conteneur de 1 024 px pour que le
          dégradé couvre toute la fenêtre, quel que soit l’écran. */}
      <section className="fond-accueil -mt-8 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] pb-6 pt-12 sm:pt-16">
        {/* même conteneur que <main> (max-w-5xl + px-6) : le formulaire et les cartes partagent le même bord gauche */}
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap gap-2">
            {(couverture.length ? couverture : [{ ville: '66023', nom: 'Montréal', millesime: 2026, role_libelle: '2026-2027-2028', apercu: false, note: null }]).map((c) => (
              <p key={c.ville} className="inline-flex items-center gap-2 rounded-full border border-ct-ligne bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-ct-gris">
                <span className={`h-1.5 w-1.5 rounded-full ${c.apercu ? 'bg-amber-500' : 'bg-ct-vert'}`} aria-hidden="true" />
                {c.nom} · {c.apercu ? 'aperçu, ' : ''}{libelleRole(c)}
              </p>
            ))}
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Votre nouvelle évaluation foncière semble-t-elle hors norme?
          </h1>
          <p className="mt-4 text-justify text-lg leading-relaxed text-ct-gris hyphens-auto" lang="fr">
            Entrez votre adresse. En une seconde, nous comparons la hausse imposée à votre
            immeuble à celle de ses bâtiments comparables — même voisinage, taille et nombre
            de logements voisins — et nous vous disons honnêtement si elle sort de
            l’ordinaire.
          </p>
          <p className="mt-3 text-sm text-ct-gris">
            Couvre{' '}
            {pleines.length
              ? pleines.map((c, i) => (
                  <span key={c.ville}>
                    {i > 0 ? ', ' : ''}<strong>{c.nom}</strong>, {libelleRole(c)}
                  </span>
                ))
              : <><strong>Montréal</strong>, rôle 2026-2027-2028</>}
            {apercus.length > 0 && (
              <>
                {' '}et, en aperçu,{' '}
                {apercus.map((c, i) => (
                  <span key={c.ville}>
                    {i > 0 ? ', ' : ''}<strong>{c.nom}</strong> ({libelleRole(c)}, période de révision terminée ; le prochain rôle sera chargé dès sa publication)
                  </span>
                ))}
              </>
            )}
            . Les autres grandes villes du Québec suivront au dépôt de leur prochain rôle. Ajoutez la
            ville après une virgule pour lever tout doute : « 1001 rue Notre-Dame Est, Montréal ».
          </p>
          <div className="mt-6">
            <PretriForm />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-5 sm:grid-cols-3">
        <Carte titre="Ce que ce tri regarde" icone={Loupe}>
          Les valeurs inscrites aux deux derniers rôles pour 371 000 immeubles résidentiels
          de 1 à 5 logements, publiées par le ministère des Affaires municipales. Votre hausse
          est située parmi celles des bâtiments comparables à moins de 500 m du vôtre.
        </Carte>
        <Carte titre="Ce qu’il ne voit pas" icone={Oeil}>
          « Dans la norme » veut dire « rien d’inhabituel par rapport à vos voisins », pas
          « juste ». Si tout un secteur est surévalué, seules les ventes réelles le montrent. Et
          après une vente récente, la nouvelle valeur reflète souvent le prix payé.
        </Carte>
        <Carte titre="Et ensuite" icone={Fleche}>
          Une demande de révision s’appuie sur les prix de vente de propriétés comparables,
          pas sur les valeurs au rôle des voisins : les municipalités l’indiquent elles-mêmes.
          C’est l’analyse que fait le rapport complet, à partir des ventes de votre secteur.
        </Carte>
      </section>

      <section className="mt-12 text-sm leading-relaxed text-ct-gris">
        <p>
          Source : rôles d’évaluation foncière du Québec (MAMH, licence CC-BY 4.0) et données
          ouvertes de la Ville de Montréal. Contest-Taxes n’est pas un évaluateur agréé ; ce tri
          est un outil d’information, pas une évaluation professionnelle.
        </p>
      </section>
    </div>
  );
}
