export default function Home() {
  return (
    <section>
      <h1 className="text-4xl font-bold">Contest-Taxes</h1>
      <p className="mt-3 max-w-2xl">
        Outil d’analyse des rôles fonciers de la Ville de Montréal pour aider les propriétaires à comprendre et, au besoin, contester leur évaluation.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href="/about" className="rounded-2xl border p-5 hover:shadow">Qui sommes-nous →</a>
        <a href="/auth" className="rounded-2xl border p-5 hover:shadow">Accéder à l’espace client →</a>
      </div>
    </section>
  );
}
