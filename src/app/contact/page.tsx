import Link from 'next/link';

export default function Page() {
  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-semibold">Nous joindre</h1>
      <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-6 leading-relaxed">
        <p className="font-medium">Le formulaire de contact n’est pas encore en service.</p>
        <p className="mt-2 text-gray-800">
          Contest-Taxes est en cours de mise en place. L’adresse courriel officielle sera
          publiée ici dès qu’elle sera prête. D’ici là, aucun message ne peut nous être
          transmis par ce site — revenez dans quelques jours.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Le pré-tri de la page d’accueil fonctionne, lui, dès maintenant.
        </p>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/" className="underline">← Retour au pré-tri</Link>
      </p>
    </section>
  );
}
