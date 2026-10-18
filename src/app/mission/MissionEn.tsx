import Image from 'next/image';

const LIEN = 'underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre';

const NOTES: { id: number; texte: React.ReactNode }[] = [
  {
    id: 1,
    texte: (
      <>
        <a href="https://www.legisquebec.gouv.qc.ca/en/document/cs/F-2.1#se:42" target="_blank" rel="noopener noreferrer" className={LIEN}>
          Act respecting municipal taxation
        </a>
        , CQLR, c. F-2.1, sections 42 to 46 (actual value, reference date).
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
          Manuel d’évaluation foncière du Québec, part 3
        </a>{' '}
        (PDF, in French), ministère des Affaires municipales et de l’Habitation.
      </>
    ),
  },
  {
    id: 3,
    texte: (
      <>
        Québec.ca,{' '}
        <a
          href="https://www.quebec.ca/en/housing-territory/land-information/property-assessment/request-review"
          target="_blank"
          rel="noopener noreferrer"
          className={LIEN}
        >
          Requesting a review of the property assessment roll
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

export default function MissionEn() {
  return (
    <article>
      <div className="flex items-center gap-4">
        <Image src="/logo-icone.png" alt="" width={72} height={56} className="h-14 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Our mission</h1>
      </div>
      <p className={`mt-6 text-lg ${PARA}`} lang="en">
        To help Québec property owners understand their new assessment and, if they choose to
        challenge it, to do so on the facts.
      </p>

      <section className="mt-10" aria-labelledby="pretri">
        <h2 id="pretri" className="text-2xl font-bold tracking-tight">The preliminary analysis, free of charge</h2>
        <div className={`mt-4 space-y-4 ${PARA}`} lang="en">
          <p>
            Every three years, your municipality files a new assessment roll, and you receive your new
            value without knowing how it compares with your neighbours’. The preliminary analysis answers
            that first question. You enter your address; we place your building’s increase among those of
            the comparable buildings in your sector: same type, house, condo or plex, similar size within
            20%, within 500 m. The result tells you whether your increase is within the norm of your sector
            or departs from it, by how many percentage points, and what each point represents in taxes at
            your municipality’s rate. It is free, needs no account, and no address is kept.
          </p>
          <p>
            What the preliminary analysis does not say: it compares values entered on the roll, not sale
            prices. “Within the norm” means “treated like your neighbours”, not “fair”. A request for
            review does not rest on a comparison with the neighbours anyway, but on the actual value of
            the building<Appel n={1} />. That is the purpose of the full analysis.
          </p>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="analyse">
        <h2 id="analyse" className="text-2xl font-bold tracking-tight">The full analysis, if you go ahead</h2>
        <div className={`mt-4 space-y-4 ${PARA}`} lang="en">
          <p>
            The law defines the value entered on the roll as the actual value of the building: the most
            probable price it would have fetched in a sale, under market conditions at the reference date,
            namely July 1 of the second year before the roll comes into force<Appel n={1} />. The
            recognised method for establishing it is comparison with sales of similar buildings
            <Appel n={2} />. That is what our report does, in four steps.
          </p>
          <ol className="list-decimal space-y-3 pl-6">
            <li>
              <strong className="text-ct-encre">The sales.</strong> We gather sales of buildings comparable
              to yours in your sector, concluded around the reference date: those your municipality
              publishes, or those you send us.
            </li>
            <li>
              <strong className="text-ct-encre">Land and building.</strong> The land value is set against
              that of comparable lots. The building value is brought down to a price per square metre of
              floor area and compared with what the sales show.
            </li>
            <li>
              <strong className="text-ct-encre">Where your assessment stands.</strong> We measure where the
              value retained by the municipality sits among those sales, and the value the comparables
              support.
            </li>
            <li>
              <strong className="text-ct-encre">The report.</strong> Tables, figures and method, in a
              document you can attach to your request for review, present to your municipality’s assessor
              and, in case of disagreement, to the Tribunal administratif du Québec<Appel n={3} />.
            </li>
          </ol>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="parcours">
        <h2 id="parcours" className="text-2xl font-bold tracking-tight">The path of a request for review</h2>
        <p className={`mt-4 ${PARA}`} lang="en">
          A request for review is filed with the municipal body responsible for assessment, generally
          before the May 1 following the coming into force of the roll, on the prescribed form and with the
          fee set by the municipality. The assessor studies the request, may meet the applicant or visit
          the building, and replies in writing. Failing an agreement, the law provides for a recourse to the
          Real Estate Division of the Tribunal administratif du Québec, within 60 days of the reply
          <Appel n={3} />.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="limites">
        <h2 id="limites" className="text-2xl font-bold tracking-tight">What we are not</h2>
        <p className={`mt-4 ${PARA}`} lang="en">
          We are not chartered appraisers. Our analyses inform and equip; they do not replace a professional
          appraisal, and we do not represent you before the Tribunal. The particular condition of a
          building, defects or upcoming work, falls to the chartered appraiser, and you may present it at
          the same stages.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="partout">
        <h2 id="partout" className="text-2xl font-bold tracking-tight">Everywhere in Québec</h2>
        <p className={`mt-4 ${PARA}`} lang="en">
          The preliminary analysis rests on the assessment rolls that the ministère des Affaires municipales
          et de l’Habitation publishes for every municipality<Appel n={4} />. It covers Montréal today and
          will extend to the other large cities when their next roll is filed. The full analysis, for its
          part, can be done anywhere comparable sales exist.
        </p>
      </section>

      <ol className="mt-10 space-y-1.5 border-t border-ct-ligne pt-4 text-sm leading-snug text-ct-gris" lang="en">
        {NOTES.map((n) => (
          <li key={n.id} id={`note-${n.id}`} className="flex gap-2">
            <a href={`#appel-${n.id}`} className="shrink-0 text-ct-vert" aria-label={`Back to note reference ${n.id}`}>
              {n.id}.
            </a>
            <span>{n.texte}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
