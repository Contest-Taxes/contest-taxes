import Image from 'next/image';

const LIEN = 'underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre';

const NOTES: { id: number; texte: React.ReactNode }[] = [
  {
    id: 1,
    texte: (
      <>
        Ministère des Affaires municipales et de l’Habitation,{' '}
        <a href="https://www.quebec.ca/habitation-territoire/information-fonciere/evaluation-fonciere/role/fonctions-responsabilites" target="_blank" rel="noopener noreferrer" className={LIEN}>
          Fonctions du rôle d’évaluation foncière et partage des responsabilités
        </a>{' '}
        and{' '}
        <a href="https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/affaires-municipales/publications/evaluation_fonciere/documentation/description_evaluation_fonciere.pdf" target="_blank" rel="noopener noreferrer" className={LIEN}>
          Qu’est-ce que l’évaluation foncière municipale?
        </a>{' '}
        (PDF, in French).
      </>
    ),
  },
  {
    id: 2,
    texte: (
      <>
        Tribunal administratif du logement,{' '}
        <a href="https://www.tal.gouv.qc.ca/en/lease-renewal-and-rent-fixing/rent-increase" target="_blank" rel="noopener noreferrer" className={LIEN}>
          Rent increase
        </a>
        ;{' '}
        <a href="https://www.legisquebec.gouv.qc.ca/en/document/cr/T-15.01,%20r.%202" target="_blank" rel="noopener noreferrer" className={LIEN}>
          Regulation respecting the criteria for the fixing of rent
        </a>
        , CQLR, c. T-15.01, r. 2, s. 3, para. 2.
      </>
    ),
  },
  {
    id: 3,
    texte: (
      <>
        <a href="https://www.legisquebec.gouv.qc.ca/en/document/cs/F-2.1#se:124" target="_blank" rel="noopener noreferrer" className={LIEN}>
          Act respecting municipal taxation
        </a>
        , CQLR, c. F-2.1, s. 124 (request for review) and{' '}
        <a href="https://www.legisquebec.gouv.qc.ca/en/document/cs/F-2.1#se:130" target="_blank" rel="noopener noreferrer" className={LIEN}>
          130
        </a>{' '}
        (filing deadline).
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

export default function AboutEn() {
  return (
    <article className="max-w-5xl">
      <div className="flex items-center gap-4">
        <Image src="/logo-icone.png" alt="" width={72} height={56} className="h-14 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">About us</h1>
      </div>
      <p className="mt-6 text-justify text-lg leading-relaxed text-ct-gris hyphens-auto" lang="en">
        Contest-Taxes is an independent Québec company, born of a challenge carried out as a family. We
        are not chartered appraisers: our analyses inform and equip, they do not replace a professional
        appraisal.
      </p>

      <section className="mt-10" aria-labelledby="qui-est-derriere">
        <h2 id="qui-est-derriere" className="text-2xl font-bold tracking-tight">Who is behind Contest-Taxes</h2>
        <p className="mt-4 text-justify leading-relaxed text-ct-gris hyphens-auto" lang="en">
          Contest-Taxes was founded by Guillaume Lenoir-Craig, an astrophysicist and college physics
          teacher. The idea came from a family experience. When the 2023 roll was filed, the assessment of
          his mother’s building, a five-unit property, was raised by 48%, far more than that of the
          neighbouring buildings. He built the case himself, from 18 sales of comparable buildings in the
          reference year and from public data. The municipality first brought the increase down to 26%.
          Conciliation before the Tribunal administratif du Québec then set it at 19.5%. Every case is
          different, and most assessments are within the norm. But when they are not, the process exists,
          and it works. Contest-Taxes takes it up again, with the statistical tools of his trade, so that any
          owner can first check, then act if there is reason to.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="pourquoi-le-nom">
        <h2 id="pourquoi-le-nom" className="text-2xl font-bold tracking-tight">Why the name “Contest-Taxes”?</h2>
        <div className="mt-4 space-y-4 text-justify leading-relaxed text-ct-gris hyphens-auto" lang="en">
          <p>
            In Québec, municipal and school taxes are calculated from the value entered on the assessment
            roll<Appel n={1} />. The higher a building’s value, the more taxes its owner pays. If that
            value is too high, the owner pays more than a fair share. And in a rental building, the tax
            increase can end up in the rent, because the Tribunal administratif du logement takes it into
            account when it sets increases<Appel n={2} />.
          </p>
          <p>
            Strictly speaking, one does not contest one’s taxes. The law<Appel n={3} /> provides instead
            for a request for review of the assessment on which they rest. But it is the tax bill that
            arrives in your mailbox, and the tax bill that makes you react. We chose this name because that
            is where you start, and so that is where we start with you.
          </p>
          <p>
            Our tool promises no reduction. It helps owners form a better-informed opinion of their new
            assessment, from public data. Most will find it within the norm, and that will be good news.
            The others will know it is worth a closer look before the deadline for a request for review.
          </p>
        </div>
        <ol className="mt-6 space-y-1.5 border-t border-ct-ligne pt-4 text-sm leading-snug text-ct-gris" lang="en">
          {NOTES.map((n) => (
            <li key={n.id} id={`note-${n.id}`} className="flex gap-2">
              <a href={`#appel-${n.id}`} className="shrink-0 text-ct-vert" aria-label={`Back to note reference ${n.id}`}>
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
