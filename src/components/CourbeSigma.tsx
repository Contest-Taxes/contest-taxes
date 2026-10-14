// Courbe en cloche avec les bandes à 1, 2 et 3 écarts-types et la position de
// l'immeuble. Palette du rapport (config.py) : bandes bleues séquentielles, du
// plus foncé (le cas courant) au plus pâle, sujet en encre noire, comparables
// en orange. En option, la distribution réelle des comparables se superpose à
// la courbe, en orange translucide.
import type { GroupeSql } from '@/lib/pretri/types';

const BANDES = [
  { de: 0, a: 1, couleur: '#6da7ec' },
  { de: 1, a: 2, couleur: '#9ec5f4' },
  { de: 2, a: 3, couleur: '#cde2fb' },
];
const LIGNE = '#184f95';
const SUJET = '#0b0b0b';
export const COMPS = '#eb6834';

const L = 340, H = 190, G = 18, D = 18, HAUT = 34, BAS = 40;
const XMAX = 4;
const px = (x: number) => G + ((x + XMAX) / (2 * XMAX)) * (L - G - D);
const pdf = (x: number) => Math.exp(-0.5 * x * x);            // sommet à 1
const py = (h: number) => H - BAS - h * (H - BAS - HAUT);      // h = hauteur relative, 1 = sommet de la courbe
const PIC_NORMAL = 1 / Math.sqrt(2 * Math.PI);                 // densité au sommet, 0,399

function aire(de: number, a: number): string {
  const pts: string[] = [];
  for (let x = de; x <= a + 1e-9; x += 0.05) pts.push(`${px(x).toFixed(1)},${py(pdf(x)).toFixed(1)}`);
  return `M${px(de).toFixed(1)},${py(0).toFixed(1)} L${pts.join(' L')} L${px(a).toFixed(1)},${py(0).toFixed(1)} Z`;
}

function courbe(): string {
  const pts: string[] = [];
  for (let x = -XMAX; x <= XMAX + 1e-9; x += 0.05) pts.push(`${px(x).toFixed(1)},${py(pdf(x)).toFixed(1)}`);
  return `M${pts.join(' L')}`;
}

const fmt = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');

/** Fonction de répartition de la loi normale centrée réduite (Abramowitz-Stegun 26.2.17, erreur < 1e-7). */
export function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-0.5 * z * z);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/** « Une évaluation sur N se situe aussi loin au-dessus de la médiane », pour une loi normale. */
export function uneSur(e: number): number {
  return 1 / (1 - phi(e));
}

/** « environ une évaluation sur 44 », avec un arrondi qui suit l'ordre de grandeur. */
export function formaterUneSur(n: number): string {
  if (!Number.isFinite(n) || n >= 1e6) return 'moins d’une évaluation sur un million';
  const arrondi = n >= 1000 ? Math.round(n / 100) * 100 : n >= 100 ? Math.round(n / 10) * 10 : Math.round(n);
  return `environ une évaluation sur ${String(arrondi).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

type Histo = NonNullable<GroupeSql['histogramme']>;

export default function CourbeSigma({ ecart, histo }: { ecart: number; histo?: Histo | null }) {
  const horsCadre = Math.abs(ecart) > 3.7;
  const xs = Math.max(-3.7, Math.min(3.7, ecart));
  const etiquette = horsCadre ? `vous : ${ecart > 0 ? '> +3' : '< −3'} σ (${fmt(ecart)})` : `vous : ${fmt(ecart)} σ`;
  const ancreTexte = xs > 2 ? 'end' : xs < -2 ? 'start' : 'middle';

  // Barres de la distribution réelle, à l'échelle de la courbe : densité
  // (part du groupe par unité de σ) rapportée à la densité du sommet normal.
  let barres: { x0: number; x1: number; h: number }[] = [];
  let nHisto = 0;
  if (histo && histo.comptes.length > 0) {
    nHisto = histo.comptes.reduce((a, b) => a + b, 0) + histo.sous + histo.sur;
    barres = histo.comptes.map((c, i) => {
      const x0 = histo.de + i * histo.pas;
      const dens = nHisto > 0 ? c / (nHisto * histo.pas) : 0;
      return { x0, x1: x0 + histo.pas, h: Math.min(1.12, dens / PIC_NORMAL) };
    });
  }

  return (
    <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Position de votre immeuble : ${fmt(ecart)} écarts-types de la médiane`} className="w-full">
      {BANDES.map((b) => (
        <g key={b.de}>
          <path d={aire(b.de, b.a)} fill={b.couleur} />
          <path d={aire(-b.a, -b.de)} fill={b.couleur} />
        </g>
      ))}
      {barres.map((b, i) => b.h > 0 && (
        <rect key={i} x={px(b.x0)} y={py(b.h)} width={px(b.x1) - px(b.x0)} height={py(0) - py(b.h)}
              fill={COMPS} fillOpacity={0.55} stroke={COMPS} strokeOpacity={0.8} strokeWidth={0.5} />
      ))}
      {histo && histo.sous > 0 && (
        <text x={G + 2} y={py(0) - 4} fontSize={9} fill={COMPS}>◂ {histo.sous} sous −4 σ</text>
      )}
      {histo && histo.sur > 0 && (
        <text x={L - D - 2} y={py(0) - 4} fontSize={9} fill={COMPS} textAnchor="end">{histo.sur} au-delà de +4 σ ▸</text>
      )}
      <path d={courbe()} fill="none" stroke={LIGNE} strokeWidth={1.5} />
      <line x1={G} y1={py(0)} x2={L - D} y2={py(0)} stroke="#c3c2b7" strokeWidth={1} />
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <g key={k}>
          <line x1={px(k)} y1={py(0)} x2={px(k)} y2={py(0) + 4} stroke="#898781" />
          <text x={px(k)} y={py(0) + 16} textAnchor="middle" fontSize={11} fill="#52514e">
            {k === 0 ? 'médiane' : `${k > 0 ? '+' : '−'}${Math.abs(k)} σ`}
          </text>
        </g>
      ))}
      <text x={px(0)} y={H - 6} textAnchor="middle" fontSize={10} fill="#898781">
        hausse de vos comparables, en écarts-types autour de la médiane
      </text>
      <line x1={px(xs)} y1={HAUT - 6} x2={px(xs)} y2={py(0)} stroke={SUJET} strokeWidth={1.5} strokeDasharray={horsCadre ? '4 3' : undefined} />
      <polygon points={`${px(xs)},${HAUT - 14} ${px(xs) - 5},${HAUT - 4} ${px(xs) + 5},${HAUT - 4}`} fill={SUJET} />
      <text x={px(xs)} y={HAUT - 18} textAnchor={ancreTexte} fontSize={12} fontWeight={600} fill={SUJET}>
        {etiquette}
      </text>
    </svg>
  );
}

// Lecture des bandes pour une loi normale, VERS LE HAUT : la seule question
// qui se pose à quelqu'un dont la hausse est élevée est « combien d'évaluations
// se situent au moins aussi loin au-dessus de la médiane ». Au-delà de +1 σ :
// 15,9 % (une sur 6) ; +2 σ : 2,3 % (une sur 44) ; +3 σ : 0,13 % (une sur 740).
// (Les proportions réellement observées à Montréal sont plus fortes — voir
// PLAN.md ; la case « distribution réelle » les montre pour le secteur.)
export const LEGENDE_SIGMA: { bande: string; couleur: string; frequence: string; lecture: string; test: (e: number) => boolean; seuil: number | null }[] = [
  { bande: 'moins de 1 σ', couleur: '#6da7ec', frequence: 'le cas courant — 2 évaluations sur 3', lecture: 'dans la norme', test: (e) => Math.abs(e) < 1, seuil: null },
  { bande: 'au-delà de +1 σ', couleur: '#9ec5f4', frequence: 'une évaluation sur 6 se situe aussi loin au-dessus de la médiane', lecture: 'significativement élevée', test: (e) => e >= 1 && e < 2, seuil: 1 },
  { bande: 'au-delà de +2 σ', couleur: '#cde2fb', frequence: 'une sur 44', lecture: 'très significativement élevée', test: (e) => e >= 2 && e < 3, seuil: 2 },
  { bande: 'au-delà de +3 σ', couleur: '#ffffff', frequence: 'une sur 740', lecture: 'hors de proportions', test: (e) => e >= 3, seuil: 3 },
];

/** Part observée du groupe au-delà d'un seuil (en σ), d'après l'histogramme ; null si indisponible. */
export function partObservee(histo: Histo | null | undefined, seuil: number | null): { n: number; total: number } | null {
  if (!histo) return null;
  const total = histo.comptes.reduce((a, b) => a + b, 0) + histo.sous + histo.sur;
  if (total === 0) return null;
  if (seuil == null) {
    // dans ±1 σ
    let n = 0;
    histo.comptes.forEach((c, i) => { const x0 = histo.de + i * histo.pas; if (x0 >= -1 && x0 + histo.pas <= 1) n += c; });
    return { n, total };
  }
  let n = histo.sur;
  histo.comptes.forEach((c, i) => { const x0 = histo.de + i * histo.pas; if (x0 >= seuil) n += c; });
  return { n, total };
}
