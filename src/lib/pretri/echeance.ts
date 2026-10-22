// Délai de la demande de révision : « avant le 1er mai suivant l'entrée en
// vigueur du rôle » (Loi sur la fiscalité municipale, art. 130). Un rôle entre
// en vigueur le 1er janvier de sa première année : la date limite est donc le
// 30 avril de cette année-là. Les délais particuliers (avis d'évaluation
// expédié après février, art. 131 ; modification du rôle en cours de cycle)
// ne sont pas traités ici.

export interface EcheanceRevision {
  /** Première année du rôle, celle de son entrée en vigueur. */
  annee: number;
  /** Dernier jour pour déposer la demande, au format AAAA-MM-JJ. */
  dateLimite: string;
  /** Vrai quand la date limite est dépassée, à l'heure du Québec. */
  passee: boolean;
}

/** Première année d'un libellé de rôle : « 2026-2027-2028 » donne 2026. */
export function premiereAnnee(roleLibelle: string | null | undefined): number | null {
  const m = roleLibelle?.match(/(?:19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/** La date du jour au Québec, au format AAAA-MM-JJ. */
function aujourdhui(maintenant: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maintenant);
}

export function echeanceRevision(roleLibelle: string | null | undefined, maintenant: Date = new Date()): EcheanceRevision | null {
  const annee = premiereAnnee(roleLibelle);
  if (annee == null) return null;
  const dateLimite = `${annee}-04-30`;
  return { annee, dateLimite, passee: aujourdhui(maintenant) > dateLimite };
}
