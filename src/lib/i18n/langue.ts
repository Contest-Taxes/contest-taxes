// Langue du site : « fr » ou « en », tenue dans un témoin (cookie) « langue »
// posé par le bouton de la barre de navigation. Les pages lisent le témoin côté
// serveur ; les composants client passent par LangueProvider.
export type Langue = 'fr' | 'en';
export const LANGUE_COOKIE = 'langue';
export const LANGUES: Langue[] = ['fr', 'en'];

export function normaliserLangue(v: string | undefined | null): Langue {
  return v === 'en' ? 'en' : 'fr';
}
