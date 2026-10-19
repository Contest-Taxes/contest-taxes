import { langueServeur } from '@/lib/i18n/serveur';
import AboutFr from './AboutFr';
import AboutEn from './AboutEn';

export async function generateMetadata() {
  const langue = await langueServeur();
  return { title: langue === 'fr' ? 'Qui sommes-nous — Contest-Taxes' : 'About us — Contest-Taxes' };
}

export default async function Page() {
  const langue = await langueServeur();
  return <div className="conteneur">{langue === 'fr' ? <AboutFr /> : <AboutEn />}</div>;
}
