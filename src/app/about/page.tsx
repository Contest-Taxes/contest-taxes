import Image from 'next/image';

const NOTES: { id: number; texte: React.ReactNode }[] = [
  {
    id: 1,
    texte: (
      <>
        Ministère des Affaires municipales et de l’Habitation,{' '}
        <a
          href="https://www.quebec.ca/habitation-territoire/information-fonciere/evaluation-fonciere/role/fonctions-responsabilites"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre"
        >
          Fonctions du rôle d’évaluation foncière et partage des responsabilités
        </a>{' '}
        et{' '}
        <a
          href="https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/affaires-municipales/publications/evaluation_fonciere/documentation/description_evaluation_fonciere.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre"
        >
          Qu’est-ce que l’évaluation foncière municipale?
        </a>{' '}
        (PDF).
      </>
    ),
  },
  {
    id: 2,
    texte: (
      <>
        Tribunal administratif du logement,{' '}
        <a
          href="https://www.tal.gouv.qc.ca/fr/reconduction-du-bail-et-fixation-de-loyer/augmentation-de-loyer"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre"
        >
          Augmentation de loyer
        </a>
        ;{' '}
        <a
          href="https://www.legisquebec.gouv.qc.ca/fr/document/rc/T-15.01,%20r.%202"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre"
        >
          Règlement sur les critères de fixation de loyer
        </a>
        , RLRQ, c. T-15.01, r. 2, art. 3, par. 2°.
      </>
    ),
  },
  {
    id: 3,
    texte: (
      <>
        <a
          href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/F-2.1#se:124"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre"
        >
          Loi sur la fiscalité municipale
        </a>
        , RLRQ, c. F-2.1, art. 124 (demande de révision) et{' '}
        <a
          href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/F-2.1#se:130"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre"
        >
          130
        </a>{' '}
        (délai de dépôt).
      </>
    ),
  },
];

function Appel({ n }: { n: number }) {
  return (
    <sup className="ml-px text-[0.7em] leading-none">
      <a id={`appel-${n}`} href={`#note-${n}`} className="text-ct-vert hover:underline" aria-label={`Note ${n}`}>
        {n}
      </a>
    </sup>
  );
}

export default function Page() {
  return (
    <article>
      <div className="flex items-center gap-4">
        <Image src="/logo-icone.png" alt="" width={72} height={56} className="h-14 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Qui sommes-nous</h1>
      </div>
      <p className="mt-6 text-justify text-lg leading-relaxed text-ct-gris hyphens-auto" lang="fr">
        Contest-Taxes est une entreprise québécoise indépendante, née d’une contestation menée en
        famille. Nous ne sommes pas évaluateurs agréés : nos analyses informent et outillent, elles ne
        remplacent pas une évaluation professionnelle.
      </p>

      <section className="mt-10" aria-labelledby="qui-est-derriere">
        <h2 id="qui-est-derriere" className="text-2xl font-bold tracking-tight">
          Qui est derrière Contest-Taxes
        </h2>
        <p className="mt-4 text-justify leading-relaxed text-ct-gris hyphens-auto" lang="fr">
          Contest-Taxes a été fondé par Guillaume Lenoir-Craig, astrophysicien et professeur de physique
          au collégial. L’idée est née d’une expérience familiale. Au dépôt du rôle de 2023, l’évaluation
          de l’immeuble de sa mère, un immeuble de cinq logements, a été haussée de 48&nbsp;%, bien plus
          que celle des immeubles voisins. Il a monté le dossier lui-même, à partir de 18 ventes
          d’immeubles comparables de l’année de référence et des données publiques. La municipalité a
          d’abord ramené la hausse à 26&nbsp;%. La conciliation devant le Tribunal administratif du Québec
          l’a ensuite fixée à 19,5&nbsp;%. Chaque dossier est différent, et la plupart des évaluations
          sont dans la norme. Mais quand elles ne le sont pas, la démarche existe, et elle fonctionne.
          Contest-Taxes la reprend, avec les outils statistiques de son métier, pour que n’importe quel
          propriétaire puisse d’abord vérifier, puis agir s’il y a lieu.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="pourquoi-le-nom">
        <h2 id="pourquoi-le-nom" className="text-2xl font-bold tracking-tight">
          Pourquoi le nom «&nbsp;Contest-Taxes&nbsp;»?
        </h2>
        <div className="mt-4 space-y-4 text-justify leading-relaxed text-ct-gris hyphens-auto" lang="fr">
          <p>
            Au Québec, les taxes municipales et scolaires se calculent à partir de la valeur inscrite au
            rôle d’évaluation<Appel n={1} />. Plus la valeur d’un immeuble est élevée, plus son propriétaire
            paie de taxes. Si cette valeur est trop élevée, il paie plus que sa juste part. Et dans un
            immeuble locatif, la hausse des taxes peut se retrouver dans le loyer, car le Tribunal
            administratif du logement en tient compte lorsqu’il fixe les augmentations<Appel n={2} />.
          </p>
          <p>
            À proprement parler, on ne conteste pas ses taxes. La loi<Appel n={3} /> prévoit plutôt une
            demande de révision de l’évaluation qui les fonde. Mais c’est le compte de taxes qui arrive
            dans votre boîte aux lettres, et c’est lui qui vous fait réagir. Nous avons choisi ce nom parce
            que c’est de là que vous partez, et c’est donc là que nous commençons avec vous.
          </p>
          <p>
            Notre outil ne promet aucune baisse. Il aide les propriétaires à se faire une opinion plus
            éclairée sur leur nouvelle évaluation, à partir de données publiques. La plupart constateront
            qu’elle est dans la norme, et ce sera une bonne nouvelle. Les autres sauront qu’il vaut la
            peine d’y regarder de plus près avant la date limite de la demande de révision.
          </p>
        </div>
        <ol className="mt-6 space-y-1.5 border-t border-ct-ligne pt-4 text-sm leading-snug text-ct-gris" lang="fr">
          {NOTES.map((n) => (
            <li key={n.id} id={`note-${n.id}`} className="flex gap-2">
              <a href={`#appel-${n.id}`} className="shrink-0 text-ct-vert" aria-label={`Retour à l’appel de note ${n.id}`}>
                {n.id}.
              </a>
              <span>{n.texte}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
