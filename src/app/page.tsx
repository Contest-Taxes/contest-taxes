import PretriForm from '@/components/PretriForm';

export default function Home() {
  return (
    <div>
      <section className="py-6">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Montréal · rôle 2026-2027-2028</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          Votre nouvelle évaluation foncière semble-t-elle hors norme?
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-700">
          Entrez votre adresse. En une seconde, nous comparons la hausse imposée à votre
          immeuble à celle de ses bâtiments comparables — même voisinage, taille et nombre
          de logements voisins — et nous vous disons honnêtement s’il vaut la peine
          d’aller plus loin.
        </p>
        <div className="mt-8">
          <PretriForm />
        </div>
      </section>

      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">Ce que ce tri regarde</h2>
          <p className="mt-2 text-sm text-gray-700">
            Les valeurs inscrites aux deux derniers rôles pour 371 000 immeubles résidentiels
            de 1 à 5 logements, publiées par le ministère des Affaires municipales. Votre hausse
            est située parmi celles des bâtiments comparables à moins de 500 m : nombre de
            logements à un près, aire d’étages à 20 % près.
          </p>
        </div>
        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">Ce qu’il ne voit pas</h2>
          <p className="mt-2 text-sm text-gray-700">
            « Conforme » veut dire « rien d’anormal par rapport à vos voisins », pas « juste ».
            Si tout un secteur est surévalué, seules les ventes réelles le montrent. Et une vente
            récente de votre immeuble justifie souvent une forte hausse.
          </p>
        </div>
        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">Et ensuite</h2>
          <p className="mt-2 text-sm text-gray-700">
            Une demande de révision se gagne avec les prix de vente de propriétés comparables,
            pas en comparant les valeurs au rôle des voisins. C’est l’analyse que fait le
            rapport complet, à partir des ventes que la Ville vous affiche.
          </p>
        </div>
      </section>

      <section className="mt-12 text-sm text-gray-600">
        <p>
          Source : rôles d’évaluation foncière du Québec (MAMH, licence CC-BY 4.0) et données
          ouvertes de la Ville de Montréal. Contest-Taxes n’est pas un évaluateur agréé ; ce tri
          est un outil d’information, pas une opinion de valeur.
        </p>
        <p className="mt-2">
          <a href="/about" className="underline">Qui sommes-nous</a> ·{' '}
          <a href="/contact" className="underline">Nous joindre</a>
        </p>
      </section>
    </div>
  );
}
