import 'server-only';
import { cookies } from 'next/headers';
import { LANGUE_COOKIE, normaliserLangue, type Langue } from './langue';

/** Langue courante, lue dans le témoin par un composant serveur. */
export async function langueServeur(): Promise<Langue> {
  const c = await cookies();
  return normaliserLangue(c.get(LANGUE_COOKIE)?.value);
}
