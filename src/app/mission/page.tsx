import { langueServeur } from '@/lib/i18n/serveur';
import MissionFr from './MissionFr';
import MissionEn from './MissionEn';

export async function generateMetadata() {
  const langue = await langueServeur();
  return { title: langue === 'fr' ? 'Notre mission — Contest-Taxes' : 'Our mission — Contest-Taxes' };
}

export default async function Page() {
  const langue = await langueServeur();
  return <div className="conteneur">{langue === 'fr' ? <MissionFr /> : <MissionEn />}</div>;
}
