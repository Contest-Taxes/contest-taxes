import type { GroupeSql } from '@/lib/pretri/types';
import type { Langue } from '@/lib/i18n/langue';
import { fmtNombre } from '@/lib/i18n/textes';

// Description en mots du groupe de bâtiments comparables, partagée par le
// panneau du site et le PDF de l'analyse préliminaire.

export interface DescriptionComparables {
  phrase: string;
  details: [string, string][];
  note: string;
}

function plage(langue: Langue, p: [number | null, number | null] | undefined, unite = '', brut = false): string | null {
  if (!p || p[0] == null || p[1] == null) return null;
  const f = (v: number) => (brut ? String(v) : fmtNombre(langue, v));
  if (p[0] === p[1]) return `${f(p[0])}${unite}`;
  return langue === 'fr' ? `de ${f(p[0])} à ${f(p[1])}${unite}` : `${f(p[0])} to ${f(p[1])}${unite}`;
}

export function decrireComparables(g: GroupeSql, langue: Langue): DescriptionComparables {
  const fr = langue === 'fr';
  const n = (v: number) => fmtNombre(langue, v);
  const parDistance = g.rayon_m != null;
  const fin = g.niveau === 'cellule et logements';
  const rayon = g.rayon_m != null ? (g.rayon_m >= 1000 ? `${g.rayon_m / 1000} km` : `${g.rayon_m} m`) : null;
  const plancher = g.classe === 'plex' ? 2 : 1;
  const logMin = g.logements != null ? Math.max(plancher, g.logements - 1) : null;
  const logMax = g.logements != null ? Math.min(5, g.logements + 1) : null;
  const mentionLogements = g.classe == null || g.classe === 'plex' || (g.logements ?? 1) > 1;
  const quoi = fr
    ? (g.classe === 'maison' ? 'maisons unifamiliales' : g.classe === 'condo' ? 'condos' : g.classe === 'plex' ? 'plex' : 'bâtiments résidentiels')
    : (g.classe === 'maison' ? 'single-family houses' : g.classe === 'condo' ? 'condos' : g.classe === 'plex' ? 'plexes' : 'residential buildings');
  const aireMot = g.classe === 'condo' ? (fr ? 'de partie privative' : 'of private area') : (fr ? 'd’étages' : 'of floor area');

  let phrase: string;
  if (parDistance) {
    if (fr) {
      const feminin = g.classe === 'maison';
      phrase = `Les ${n(g.n)} ${quoi} ${feminin ? 'situées' : 'situés'} à moins de ${rayon} ${feminin ? 'de la vôtre' : 'du vôtre'}`;
      if (mentionLogements && logMin != null && logMax != null) {
        phrase += `, de ${logMin === logMax ? logMin : `${logMin} à ${logMax}`} logement${logMax > 1 ? 's' : ''}`;
        if (g.logements != null) phrase += ` (le vôtre : ${g.logements})`;
      }
      if (g.aire_sujet_m2 != null) phrase += `, d’aire ${aireMot} à ±20 % de la vôtre (${n(g.aire_sujet_m2)} m²)`;
      if (g.rues.length > 0) phrase += `, autour de : ${g.rues.join(', ')}`;
      phrase += '.';
    } else {
      phrase = `The ${n(g.n)} ${quoi} within ${rayon} of yours`;
      if (mentionLogements && logMin != null && logMax != null) {
        phrase += `, with ${logMin === logMax ? logMin : `${logMin} to ${logMax}`} unit${logMax > 1 ? 's' : ''}`;
        if (g.logements != null) phrase += ` (yours: ${g.logements})`;
      }
      if (g.aire_sujet_m2 != null) phrase += `, with ${g.classe === 'condo' ? 'private area' : 'floor area'} within ±20% of yours (${n(g.aire_sujet_m2)} m²)`;
      if (g.rues.length > 0) phrase += `, around: ${g.rues.join(', ')}`;
      phrase += '.';
    }
  } else {
    phrase = fr
      ? `Les ${n(g.n)} immeubles ${fin ? `de ${g.logements} logement${(g.logements ?? 0) > 1 ? 's' : ''}` : 'résidentiels de 1 à 5 logements'} de votre cellule cadastrale, un carré d’environ 1 km de côté.`
      : `The ${n(g.n)} ${fin ? `${g.logements}-unit` : '1- to 5-unit residential'} buildings of your cadastral cell, a square about 1 km on a side.`;
  }

  const details: [string, string][] = [];
  const aire = plage(langue, g.aire_m2, ' m²');
  const etages = plage(langue, g.etages);
  const annees = plage(langue, g.annees, '', true);
  if (aire) details.push([g.classe === 'condo' ? (fr ? 'Aire privative' : 'Private area') : (fr ? 'Aire d’étages' : 'Floor area'), aire]);
  if (etages) details.push([fr ? 'Étages' : 'Storeys', etages]);
  if (annees) details.push([fr ? 'Construction' : 'Built', annees]);

  let note: string;
  if (parDistance) {
    if (g.rayon_m != null && g.rayon_m > 500) {
      note = fr ? `Trop peu de bâtiments comparables à moins de 500 m : le rayon a été élargi à ${rayon}.`
                : `Too few comparable buildings within 500 m: the radius was widened to ${rayon}.`;
    } else {
      const finesse = fr
        ? (g.classe === 'maison' ? 'Même voisinage, maisons unifamiliales seulement, même taille'
          : g.classe === 'condo' ? 'Même voisinage, condos seulement, même taille'
          : g.classe === 'plex' ? 'Même voisinage, plex seulement, même taille, même nombre de logements à un près'
          : 'Même voisinage, même taille, même nombre de logements à un près')
        : (g.classe === 'maison' ? 'Same neighbourhood, single-family houses only, similar size'
          : g.classe === 'condo' ? 'Same neighbourhood, condos only, similar size'
          : g.classe === 'plex' ? 'Same neighbourhood, plexes only, similar size, number of units within one'
          : 'Same neighbourhood, similar size, number of units within one');
      note = fr ? `${finesse} : la comparaison la plus fine que permettent les données publiques.`
                : `${finesse}: the finest comparison public data allow.`;
    }
  } else {
    note = fin
      ? (fr ? 'Même cellule, même nombre de logements : la comparaison la plus fine que permettent les données publiques.'
            : 'Same cell, same number of units: the finest comparison public data allow.')
      : (fr ? 'Trop peu d’immeubles de même taille dans la cellule : la comparaison porte sur toute la cellule.'
            : 'Too few buildings of similar size in the cell: the comparison covers the whole cell.');
  }
  note += ' ' + (fr
    ? 'Les bâtiments agrandis entre les deux rôles en sont exclus. Aucun ajustement pour l’âge ou l’état : c’est une analyse préliminaire, pas une évaluation.'
    : 'Buildings enlarged between the two rolls are excluded. No adjustment for age or condition: this is a preliminary analysis, not an appraisal.');
  return { phrase, details, note };
}
