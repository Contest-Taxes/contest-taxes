import PretriForm from '@/components/PretriForm';

function Carte({ titre, children, icone }: { titre: string; children: React.ReactNode; icone: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ct-vert-pale text-ct-vert-fonce" aria-hidden="true">
          {icone}
        </span>
        <h2 className="font-semibold">{titre}</h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ct-gris">{children}</p>
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

export default function Home() {
  return (
    <div>
      <section className="fond-accueil -mx-6 -mt-8 px-6 pb-12 pt-12 sm:pt-16">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-ct-ligne bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-ct-gris">
            <span className="h-1.5 w-1.5 rounded-full bg-ct-vert" aria-hidden="true" />
            Montréal · rôle 2026-2027-2028
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Votre nouvelle évaluation foncière semble-t-elle hors norme?
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ct-gris">
            Entrez votre adresse. En une seconde, nous comparons la hausse imposée à votre
            immeuble à celle de ses bâtiments comparables — même voisinage, taille et nombre
            de logements voisins — et nous vous disons honnêtement s’il vaut la peine
            d’aller plus loin.
          </p>
          <div className="mt-8">
            <PretriForm />
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-5 sm:grid-cols-3">
        <Carte titre="Ce que ce tri regarde" icone={Loupe}>
          Les valeurs inscrites aux deux derniers rôles pour 371 000 immeubles résidentiels
          de 1 à 5 logements, publiées par le ministère des Affaires municipales. Votre hausse
          est située parmi celles des bâtiments comparables à moins de 500 m : nombre de
          logements à un près, aire d’étages à 20 % près.
        </Carte>
        <Carte titre="Ce qu’il ne voit pas" icone={Oeil}>
          « Conforme » veut dire « rien d’anormal par rapport à vos voisins », pas « juste ».
          Si tout un secteur est surévalué, seules les ventes réelles le montrent. Et une vente
          récente de votre immeuble justifie souvent une forte hausse.
        </Carte>
        <Carte titre="Et ensuite" icone={Fleche}>
          Une demande de révision se gagne avec les prix de vente de propriétés comparables,
          pas en comparant les valeurs au rôle des voisins. C’est l’analyse que fait le
          rapport complet, à partir des ventes que la Ville vous affiche.
        </Carte>
      </section>

      <section className="mt-12 text-sm leading-relaxed text-ct-gris">
        <p>
          Source : rôles d’évaluation foncière du Québec (MAMH, licence CC-BY 4.0) et données
          ouvertes de la Ville de Montréal. Contest-Taxes n’est pas un évaluateur agréé ; ce tri
          est un outil d’information, pas une opinion de valeur.
        </p>
      </section>
    </div>
  );
}
