import Image from 'next/image';

const LIEN = 'underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre';

const NOTES: { id: number; texte: React.ReactNode }[] = [
  {
    id: 1,
    texte: (
      <>
        <a href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/F-2.1#se:42" target="_blank" rel="noopener noreferrer" className={LIEN}>
          Loi sur la fiscalité municipale
        </a>
        , RLRQ, c. F-2.1, articles 42 à 46 (valeur réelle, date de référence).
      </>
    ),
  },
  {
    id: 2,
    texte: (
      <>
        <a
          href="https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/affaires-municipales/publications/evaluation_fonciere/manuel_evaluation_fonciere/2026/MEFQ_partie_3_2026.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className={LIEN}
        >
          Manuel d’évaluation foncière du Québec, partie 3
        </a>{' '}
        (PDF), ministère des Affaires municipales et de l’Habitation.
      </>
    ),
  },
  {
    id: 3,
    texte: (
      <>
        Québec.ca,{' '}
        <a
          href="https://www.quebec.ca/habitation-territoire/information-fonciere/evaluation-fonciere/demander-revision"
          target="_blank"
          rel="noopener noreferrer"
          className={LIEN}
        >
          Demander la révision du rôle d’évaluation foncière
        </a>
        .
      </>
    ),
  },
  {
    id: 4,
    texte: (
      <>
        Données Québec,{' '}
        <a
          href="https://www.donneesquebec.ca/recherche/dataset/roles-d-evaluation-fonciere-du-quebec"
          target="_blank"
          rel="noopener noreferrer"
          className={LIEN}
        >
          Rôle d’évaluation foncière du Québec
        </a>
        , ministère des Affaires municipales et de l’Habitation.
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

const PARA = 'text-justify leading-relaxed text-ct-gris hyphens-auto';

export default function MissionFr() {
  return (
    <article>
      <div className="flex items-center gap-4">
        <Image src="/logo-icone.png" alt="" width={72} height={56} className="h-14 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Notre mission</h1>
      </div>
      <p className={`mt-6 text-lg ${PARA}`} lang="fr">
        Aider les propriétaires du Québec à comprendre leur nouvelle évaluation foncière et, s’ils
        choisissent de la contester, à le faire sur des faits.
      </p>

      <section className="mt-10" aria-labelledby="pretri">
        <h2 id="pretri" className="text-2xl font-bold tracking-tight">L’analyse préliminaire, gratuite</h2>
        <div className={`mt-4 space-y-4 ${PARA}`} lang="fr">
          <p>
            Tous les trois ans, votre municipalité dépose un nouveau rôle d’évaluation, et vous recevez
            votre nouvelle valeur sans savoir comment elle se compare à celles de vos voisins. L’analyse préliminaire
            répond à cette première question. Vous entrez votre adresse ; nous situons la hausse de votre
            immeuble parmi celles des bâtiments comparables de votre secteur : même type, maison, condo ou
            plex, même taille à 20&nbsp;% près, à moins de 500&nbsp;m. Le résultat vous dit si votre hausse
            est dans la norme de votre secteur ou si elle s’en écarte, de combien de points de pourcentage,
            et ce que chaque point représente en taxes au taux de votre municipalité. C’est gratuit, sans
            compte, et aucune adresse n’est conservée.
          </p>
          <p>
            Ce que l’analyse préliminaire ne dit pas : il compare des valeurs inscrites au rôle, pas des prix de vente.
            «&nbsp;Dans la norme&nbsp;» signifie «&nbsp;traité comme vos voisins&nbsp;», pas
            «&nbsp;juste&nbsp;». Une demande de révision ne se fonde d’ailleurs pas sur la comparaison avec
            les voisins, mais sur la valeur réelle de l’immeuble<Appel n={1} />. C’est l’objet de l’analyse
            complète.
          </p>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="analyse">
        <h2 id="analyse" className="text-2xl font-bold tracking-tight">L’analyse complète, si vous allez de l’avant</h2>
        <div className={`mt-4 space-y-4 ${PARA}`} lang="fr">
          <p>
            La loi définit la valeur inscrite au rôle comme la valeur réelle de l’immeuble : le prix le plus
            probable qu’il aurait obtenu lors d’une vente, dans les conditions du marché à la date de
            référence, soit le 1<sup>er</sup> juillet de la deuxième année précédant l’entrée en vigueur du
            rôle<Appel n={1} />. La méthode reconnue pour l’établir est la comparaison avec les ventes
            d’immeubles semblables<Appel n={2} />. C’est ce que fait notre rapport, en quatre temps.
          </p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <strong className="text-ct-encre">Les ventes.</strong> Nous rassemblons les ventes d’immeubles
              comparables au vôtre dans votre secteur, conclues autour de la date de référence : celles que
              votre municipalité publie, ou celles que vous nous transmettez.
            </li>
            <li>
              <strong className="text-ct-encre">Le terrain et le bâtiment.</strong> La valeur du terrain est
              confrontée à celle des terrains comparables. La valeur du bâtiment est ramenée au prix par
              mètre carré d’aire d’étages et mise en regard de ce que les ventes montrent.
            </li>
            <li>
              <strong className="text-ct-encre">La position de votre évaluation.</strong> Nous mesurons où se
              situe la valeur retenue par la municipalité parmi ces ventes, et la valeur que les comparables
              appuient.
            </li>
            <li>
              <strong className="text-ct-encre">Le rapport.</strong> Tableaux, figures et méthode, dans un
              document que vous pouvez joindre à votre demande de révision, présenter à l’évaluateur de votre
              municipalité et, en cas de désaccord, au Tribunal administratif du Québec<Appel n={3} />.
            </li>
          </ol>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="parcours">
        <h2 id="parcours" className="text-2xl font-bold tracking-tight">Le parcours d’une demande de révision</h2>
        <p className={`mt-4 ${PARA}`} lang="fr">
          Une demande de révision se dépose auprès de l’organisme municipal responsable de l’évaluation, en
          général avant le 1<sup>er</sup> mai qui suit l’entrée en vigueur du rôle, sur le formulaire prescrit
          et avec les frais que fixe la municipalité. L’évaluateur étudie la demande, peut rencontrer le
          demandeur ou visiter l’immeuble, et répond par écrit. Sans entente, la loi prévoit un recours à la
          Section des affaires immobilières du Tribunal administratif du Québec, dans les 60 jours de la
          réponse<Appel n={3} />.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="limites">
        <h2 id="limites" className="text-2xl font-bold tracking-tight">Ce que nous ne sommes pas</h2>
        <p className={`mt-4 ${PARA}`} lang="fr">
          Nous ne sommes pas évaluateurs agréés. Nos analyses informent et outillent ; elles ne remplacent
          pas une évaluation professionnelle, et nous ne vous représentons pas devant le Tribunal. L’état
          particulier d’un immeuble, défauts ou travaux à venir, relève de l’évaluateur agréé, et peut être
          présenté par vous aux mêmes étapes.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="partout">
        <h2 id="partout" className="text-2xl font-bold tracking-tight">Partout au Québec</h2>
        <p className={`mt-4 ${PARA}`} lang="fr">
          L’analyse préliminaire repose sur les rôles d’évaluation que le ministère des Affaires municipales et de
          l’Habitation publie pour toutes les municipalités<Appel n={4} />. Il couvre aujourd’hui Montréal et
          s’étendra aux autres grandes villes au dépôt de leur prochain rôle. L’analyse complète, elle, se
          fait partout où des ventes comparables existent.
        </p>
      </section>

      <ol className="mt-10 space-y-1.5 border-t border-ct-ligne pt-4 text-sm leading-snug text-ct-gris" lang="fr">
        {NOTES.map((n) => (
          <li key={n.id} id={`note-${n.id}`} className="flex gap-2">
            <a href={`#appel-${n.id}`} className="shrink-0 text-ct-vert" aria-label={`Retour à l’appel de note ${n.id}`}>
              {n.id}.
            </a>
            <span>{n.texte}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
