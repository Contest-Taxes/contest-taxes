import Image from 'next/image';

export default function Page() {
  return (
    <article>
      <div className="flex items-center gap-4">
        <Image src="/logo-icone.png" alt="" width={72} height={56} className="h-14 w-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Qui sommes-nous</h1>
      </div>
      <p className="mt-6 text-justify text-lg leading-relaxed text-ct-gris hyphens-auto" lang="fr">
        Contest-Taxes est un service d’analyse qui met en forme les ventes comparables fournies
        par la Ville pour produire un rapport clair et exploitable lors d’une demande de révision
        de l’évaluation foncière.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {[
          ['Transparence', 'Chaque chiffre du rapport se recalcule à partir de données publiques, et la méthode est celle que la Ville décrit elle-même.'],
          ['Honnêteté', 'Le pré-tri gratuit dit à la plupart des propriétaires qu’ils n’ont pas de cause. Nous ne vendons pas de rapport à qui n’en a pas besoin.'],
          ['Limites assumées', 'Nous ne sommes pas évaluateurs agréés. Nos analyses informent et outillent ; elles ne remplacent pas une opinion de valeur.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-ct-ligne bg-white p-5 shadow-sm">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-2 text-justify text-sm leading-relaxed text-ct-gris hyphens-auto" lang="fr">{d}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
