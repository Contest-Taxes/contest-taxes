import ContactForm from '@/components/ContactForm';
import { langueServeur } from '@/lib/i18n/serveur';
import { t } from '@/lib/i18n/textes';

const COURRIEL = 'contact@contest-taxes.ca';

export async function generateMetadata() {
  const langue = await langueServeur();
  return langue === 'fr'
    ? { title: 'Nous joindre — Contest-Taxes', description: 'Écrivez à Contest-Taxes : contact@contest-taxes.ca ou le formulaire de cette page.' }
    : { title: 'Contact — Contest-Taxes', description: 'Write to Contest-Taxes: contact@contest-taxes.ca or the form on this page.' };
}

export default async function Page() {
  const langue = await langueServeur();
  const T = t(langue).contact;
  return (
    <div className="conteneur"><section className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">{T.titre}</h1>
      <p className="mt-4 leading-relaxed">
        {T.intro1}{' '}
        <a href={`mailto:${COURRIEL}`} className="font-medium text-ct-vert underline decoration-ct-ligne underline-offset-2 hover:text-ct-vert-fonce">{COURRIEL}</a>{' '}
        {T.intro2}
      </p>
      <p className="mt-2 text-sm text-ct-gris">
        {T.dossier1} <a href="/dashboard" className="underline">{T.dossier2}</a>.
      </p>
      <ContactForm />
    </section></div>
  );
}
