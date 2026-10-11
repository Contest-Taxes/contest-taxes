import type { Categorie, ResultatSql, Verdict } from './types';

// Port de contestaxes.pretri.evaluer : mêmes catégories, mêmes phrases, mot
// pour mot, pour que le site et le moteur disent la même chose. Les seuls
// textes propres au site sont ceux des adresses introuvables ou partagées,
// que le moteur formulait pour la console.

const pct = (v: number) =>
  (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') + ' %';

const dollars = (v: number) =>
  String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';

const sigma = (v: number) => Math.abs(v).toFixed(1).replace('.', ',');

const RESERVE_VENTE =
  "Un point que ce tri ne peut pas vérifier : si votre immeuble a été vendu " +
  "vers 2024, la hausse ne fait sans doute que rattraper le prix payé, et elle " +
  "est alors pleinement justifiée.";

const FORCE: Record<'defendable' | 'solide' | 'hors_proportions', string> = {
  defendable: 'se distingue de celle de vos semblables',
  solide: 'se distingue nettement de celle de vos semblables',
  hors_proportions: 'est hors de proportion avec celle de vos semblables',
};

function base(r: ResultatSql, categorie: Categorie): Verdict {
  return {
    categorie,
    trouve: Boolean(r.trouve),
    rapport_recommande: Boolean(r.rapport_recommande),
    titre: '',
    message: '',
    reserve: '',
    pistes: [],
    unite: r.unite ?? null,
    chiffres: r.pretri ?? null,
    groupe: r.groupe ?? null,
  };
}

function introuvable(r: ResultatSql, adresse: string): Verdict {
  const v = base(r, 'introuvable');
  v.titre = 'Adresse introuvable';
  const d = r.diagnostic;
  switch (d?.cas) {
    case 'voie_inconnue':
      if (d.voies_proches && d.voies_proches.length > 0) {
        v.message = `La voie « ${d.voie} » n'existe pas telle quelle. Voies approchantes :`;
        v.pistes = d.voies_proches;
      } else {
        v.message =
          `Aucune voie ne correspond à « ${d.voie} » dans l'agglomération de Montréal. ` +
          `Ce tri ne couvre pour l'instant que Montréal ; si l'immeuble est ailleurs au ` +
          `Québec, écrivez-nous.`;
      }
      break;
    case 'hors_plage':
      v.message =
        `La voie « ${d.voie} » existe à Montréal, mais ses numéros civiques vont de ` +
        `${d.plage?.[0]} à ${d.plage?.[1]}. Le numéro demandé est hors de cette plage : ` +
        `l'adresse appartient probablement à une autre municipalité du Québec. Ce tri ne ` +
        `couvre pour l'instant que l'agglomération de Montréal.`;
      break;
    case 'numero_absent':
      v.message =
        `La voie « ${d.voie} » existe à Montréal (numéros de ${d.plage?.[0]} à ` +
        `${d.plage?.[1]}), mais aucune unité d'évaluation ne porte ce numéro. Numéros ` +
        `voisins présents :`;
      v.pistes = d.voisins ?? [];
      break;
    default:
      v.message =
        `« ${adresse} » n'a pas pu être découpée en numéro civique + voie. ` +
        `Format attendu : « 1482 Rue Marie-Anne Est ».`;
  }
  return v;
}

export function verdict(r: ResultatSql, adresseSaisie: string): Verdict {
  const v = calculer(r, adresseSaisie);
  v.pistes = Array.from(new Set(v.pistes));   // jamais deux pistes identiques
  return v;
}

function calculer(r: ResultatSql, adresseSaisie: string): Verdict {
  if (!r || r.categorie === 'introuvable') return introuvable(r, adresseSaisie);

  if (r.categorie === 'adresse_partagee') {
    const v = base(r, 'adresse_partagee');
    v.titre = 'Plusieurs unités partagent cette adresse';
    v.message =
      `${r.n_unites} unités d'évaluation sont inscrites à cette adresse — il s'agit ` +
      `sans doute d'une copropriété. Ce tri ne peut pas encore distinguer les unités ` +
      `d'un même immeuble ; le numéro d'appartement sera demandé dans une prochaine ` +
      `version. Écrivez-nous si vous souhaitez une analyse dès maintenant.`;
    return v;
  }

  if (r.categorie === 'hors_champ') {
    const v = base(r, 'hors_champ');
    v.titre = 'Hors du champ de cet outil';
    v.message =
      "Ce tri ne couvre que les immeubles résidentiels de cinq logements ou moins — " +
      "la même catégorie que l'outil de comparables de la Ville. Écrivez-nous : une " +
      "analyse reste possible, mais elle se prépare autrement.";
    return v;
  }

  const p = r.pretri;
  if (!p) return introuvable(r, adresseSaisie);
  const v = base(r, r.categorie);

  if (r.categorie === 'batiment_modifie') {
    v.titre = 'Votre bâtiment a changé entre les deux rôles';
    v.message =
      "L'aire d'étages inscrite au rôle a changé d'un cycle à l'autre. La hausse de " +
      `${pct(p.hausse_pct)} suit donc probablement des travaux d'agrandissement, et se ` +
      "compare mal à celle des immeubles restés identiques. Une analyse reste possible, " +
      "mais ce tri automatique ne peut pas trancher.";
    return v;
  }

  if (r.categorie === 'indeterminable' || p.ecart_sigma == null) {
    v.categorie = 'indeterminable';
    v.titre = "Pas assez d'immeubles semblables pour trancher";
    v.message =
      "Votre secteur compte trop peu d'immeubles de même catégorie pour établir une " +
      "comparaison fiable. Une analyse complète, fondée sur un voisinage élargi, reste " +
      "possible.";
    return v;
  }

  const e = p.ecart_sigma;
  const med = p.secteur_mediane_pct ?? 0;
  const commun =
    `Au rôle ${p.role_libelle}, votre immeuble passe de ${dollars(p.valeur_precedente)} ` +
    `à ${dollars(p.valeur_proposee)}, soit ${pct(p.hausse_pct)}. Les ${p.n_comparables} ` +
    `bâtiments comparables de votre secteur ont connu ${pct(med)} en médiane.`;

  if (r.categorie === 'avantageux') {
    v.titre = 'Votre évaluation est plus basse que celle de vos semblables';
    v.message =
      `${commun} Vous êtes nettement en dessous. Contester exposerait au risque d'une ` +
      `révision à la hausse — nous vous le déconseillons.`;
    return v;
  }

  if (r.categorie === 'conforme') {
    v.titre = 'Votre évaluation paraît conforme';
    v.message =
      `${commun} L'écart reste dans la variation ordinaire entre immeubles semblables. ` +
      `Une contestation fondée sur la valeur aurait peu de chances d'aboutir, et les ` +
      `frais d'ouverture seraient perdus.`;
    v.reserve =
      "Restent d'autres motifs, indépendants de la valeur : une erreur de superficie, " +
      "de nombre de logements ou d'usage inscrit au rôle se conteste aussi, et se " +
      "vérifie sur votre avis d'évaluation.";
    return v;
  }

  // defendable, solide, hors_proportions
  const cat = r.categorie as keyof typeof FORCE;
  v.rapport_recommande = true;
  v.titre = `Votre hausse ${FORCE[cat]}`;
  const rang =
    p.centile != null
      ? `Vous vous situez au ${p.centile.toFixed(0)}ᵉ centile de votre secteur, à`
      : 'Vous vous situez à';
  v.message =
    `${commun} ${rang} ${sigma(e)} écarts-types de la médiane. Un écart de cette ` +
    `ampleur mérite d'être examiné en détail.`;
  v.reserve = RESERVE_VENTE;
  return v;
}
