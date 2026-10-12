import type { TransitionSql } from '@/lib/pretri/types';

// L'immeuble au fil des rôles : sa valeur à chaque rôle depuis 2017, reliée
// par une ligne, chaque point coloré selon la position de la hausse par rapport
// aux bâtiments comparables du cycle. Palette du rapport.
const COULEURS = {
  inconnu: '#a3a8a4', bas: '#6da7ec', norme: '#367b3a', eleve: '#d97706', tres: '#ea580c', hors: '#ba2a24',
};
function teinte(e: number | null, modifie: boolean): keyof typeof COULEURS {
  if (modifie || e == null) return 'inconnu';
  if (e <= -1) return 'bas';
  if (e < 1) return 'norme';
  if (e < 2) return 'eleve';
  if (e < 3) return 'tres';
  return 'hors';
}
const LECTURE: Record<keyof typeof COULEURS, string> = {
  inconnu: 'non comparable', bas: 'sous les comparables', norme: 'dans la norme',
  eleve: 'élevée', tres: 'très élevée', hors: 'hors de proportions',
};

const argent = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(2).replace('.', ',')} M$` : `${Math.round(v / 1000)} k$`;
const pct = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') + ' %';

export default function CourbeHistorique({ historique }: { historique: TransitionSql[] }) {
  const h = historique.filter((t) => t.valeur_apres != null && t.role_libelle);
  if (h.length === 0) return null;
  // Points : le rôle antérieur de la première transition, puis le rôle d'arrivée de chacune.
  const debut = (lib: string) => parseInt(lib.slice(0, 4), 10);
  const points: { annee: number; valeur: number; hausse: number | null; ecart: number | null; modifie: boolean; n: number | null }[] = [];
  const first = h[0];
  if (first.valeur_avant != null) {
    points.push({ annee: debut(first.role_libelle!) - 3, valeur: first.valeur_avant, hausse: null, ecart: null, modifie: false, n: null });
  }
  for (const t of h) {
    points.push({ annee: debut(t.role_libelle!), valeur: t.valeur_apres!, hausse: t.hausse_pct, ecart: t.ecart_sigma, modifie: t.batiment_modifie, n: t.n_comparables });
  }
  if (points.length < 2) return null;

  const L = 360, H = 170, G = 14, D = 14, HAUT = 30, BAS = 36;
  const vals = points.map((p) => p.valeur);
  const vmin = Math.min(...vals) * 0.9, vmax = Math.max(...vals) * 1.06;
  const px = (i: number) => G + 28 + (i / (points.length - 1)) * (L - G - D - 56);
  const py = (v: number) => H - BAS - ((v - vmin) / (vmax - vmin)) * (H - BAS - HAUT);
  const trace = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.valeur).toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${L} ${H}`} role="img" className="w-full"
           aria-label={`Valeur au rôle de ${points[0].annee} à ${points[points.length - 1].annee}`}>
        <line x1={G} y1={H - BAS} x2={L - D} y2={H - BAS} stroke="#c3c2b7" />
        <path d={trace} fill="none" stroke="#184f95" strokeWidth={1.5} />
        {points.map((p, i) => {
          const k = teinte(p.ecart, p.modifie);
          return (
            <g key={p.annee}>
              <circle cx={px(i)} cy={py(p.valeur)} r={5} fill={COULEURS[k]} stroke="#fff" strokeWidth={1.5} />
              <text x={px(i)} y={py(p.valeur) - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1e2223">{argent(p.valeur)}</text>
              <text x={px(i)} y={H - BAS + 15} textAnchor="middle" fontSize={11} fill="#52514e">{p.annee}</text>
              {p.hausse != null && i > 0 && (
                <text x={(px(i) + px(i - 1)) / 2} y={H - BAS + 29} textAnchor="middle" fontSize={10} fill={COULEURS[k]} fontWeight={600}>{pct(p.hausse)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="mt-1 grid gap-x-4 gap-y-1 text-xs text-ct-gris sm:grid-cols-2">
        {points.slice(1).map((p) => {
          const k = teinte(p.ecart, p.modifie);
          return (
            <li key={p.annee} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COULEURS[k] }} />
              <span>
                Rôle {p.annee} : {p.hausse != null ? pct(p.hausse) : '—'}
                {p.ecart != null && !p.modifie ? ` — ${LECTURE[k]} (${(p.ecart >= 0 ? '+' : '−') + Math.abs(p.ecart).toFixed(1).replace('.', ',')} σ sur ${p.n} comparables)` : ` — ${LECTURE[k]}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
