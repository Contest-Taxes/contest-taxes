import type { Categorie, FraisSql, ResultatSql, TauxSql, Verdict } from './types';

// Port de contestaxes.pretri.evaluer : mêmes catégories, mêmes phrases, mot
// pour mot, pour que le site et le moteur disent la même chose. Les seuls
// textes propres au site sont ceux des adresses introuvables ou partagées,
// que le moteur formulait pour la console.

const pct = (v: number) =>
  (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') + ' %';

const dollars = (v: number) =>
  String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';

const sigma = (v: number) => Math.abs(v).toFixed(1).replace('.', ',');

/** « 2,0 points de pourcentage » (singulier sous 2). */
const points = (v: number) =>
  `${Math.abs(v).toFixed(1).replace('.', ',')} point${Math.abs(v) >= 2 ? 's' : ''} de pourcentage`;

const taux = (v: number) => v.toFixed(3).replace('.', ',') + ' %';

const arrondir = (v: number) => Math.floor(v + 0.5);

/** Secteur où la Ville a appliqué le même facteur à tous les comparables. */
function phraseUniforme(ecartPoints: number): string {
  const debut =
    'Dans votre secteur, la Ville a appliqué à peu près la même hausse à tous ' +
    'les bâtiments comparables : votre immeuble ';
  if (Math.abs(ecartPoints) < 0.05) return debut + 'a reçu cette même hausse.';
  const sens = ecartPoints > 0 ? 'au-dessus' : 'au-dessous';
  return debut + `se situe à ${points(ecartPoints)} ${sens} de cette hausse.`;
}

/** 90 $, 574,50 $ : les cents seulement s'il y en a. */
const montant = (v: number) =>
  (Math.abs(v - Math.round(v)) >= 0.005
    ? v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')) + ' $';

/** Les frais de dépôt d'une demande de révision et leur remboursement (ou non). */
function phraseFrais(fr: FraisSql): string {
  let s =
    `Déposer une demande de révision à ${fr.nom} coûte ${montant(fr.frais)} pour un immeuble ` +
    `de cette valeur, selon le barème de ${fr.annee}.`;
  if (fr.remboursement) s += ' ' + fr.remboursement;
  return s;
}

/** Ce qu'un point de hausse coûte, et ce que l'écart coûte, au taux de l'immeuble. */
function phraseEnjeu(valeurPrecedente: number, ecartPoints: number, tx: TauxSql): string {
  const cout = arrondir(valeurPrecedente * 0.01 * tx.taux_pct / 100);
  const ou =
    tx.niveau === 'arrondissement'
      ? `Au taux de taxation résidentiel de ${taux(tx.taux_pct)} en vigueur en ${tx.annee} dans ${tx.libelle}`
      : `Au taux global de taxation de ${taux(tx.taux_pct)} de ${tx.libelle} ` +
        `(données ${tx.annee} du ministère des Affaires municipales et de l'Habitation)`;
  let s = `${ou}, chaque point de pourcentage de hausse représente environ ${dollars(cout)} de taxes par année.`;
  if (ecartPoints >= 0.05) {
    const parAn = arrondir(ecartPoints * cout);
    s +=
      ` Vos ${points(ecartPoints)} de plus que vos comparables vous coûteraient donc ` +
      `près de ${dollars(parAn)} par année, soit environ ${dollars(3 * parAn)} sur les ` +
      `trois ans du rôle, si les taux restaient les mêmes.`;
  }
  return s;
}

const RESERVE_VENTE =
  "Un point que ce tri ne peut pas vérifier : si votre immeuble a été vendu " +
  "vers 2024, la nouvelle valeur reflète sans doute le prix payé, et l'écart " +
  "s'explique alors de lui-même.";

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
    appartement_requis: false,
    unite: r.unite ?? null,
    chiffres: r.pretri ?? null,
    groupe: r.groupe ?? null,
    historique: [],
    enjeu: '',
    taux: r.pretri?.taux ?? null,
    frais_texte: '',
    frais: r.pretri?.frais ?? null,
    couverture: r.couverture ?? null,
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
          `Aucune voie ne correspond à « ${d.voie} » à ${r.couverture?.nom ?? 'Montréal'}. ` +
          `Si l'immeuble est dans une autre ville, ajoutez-la après une virgule.`;
      }
      break;
    case 'hors_plage':
      v.message =
        `La voie « ${d.voie} » existe à ${r.couverture?.nom ?? 'Montréal'}, mais ses numéros civiques vont de ` +
        `${d.plage?.[0]} à ${d.plage?.[1]}. Le numéro demandé est hors de cette plage : ` +
        `l'adresse appartient probablement à une autre municipalité. Si c'est le cas, ` +
        `ajoutez la ville après une virgule.`;
      break;
    case 'numero_absent':
      v.message =
        `La voie « ${d.voie} » existe à ${r.couverture?.nom ?? 'Montréal'} (numéros de ${d.plage?.[0]} à ` +
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
  if (r && r.categorie === 'ville_inconnue') {
    const v = base(r, 'ville_inconnue');
    v.titre = 'Municipalité non reconnue';
    v.message =
      `Nous ne reconnaissons pas la municipalité « ${r.ville ?? ''} ». Vérifiez ` +
      `l'orthographe, ou entrez l'adresse sans la ville si l'immeuble est ` +
      `à Montréal.`;
    return v;
  }
  if (r && r.categorie === 'ville_non_couverte') {
    const v = base(r, 'ville_non_couverte');
    v.titre = "Cette ville n'est pas encore couverte";
    v.message =
      `${r.ville ?? 'Cette ville'} n'est pas encore dans notre base. Elle suivra au dépôt ` +
      `de son prochain rôle d'évaluation ; les villes couvertes sont indiquées sur la page d'accueil.`;
    return v;
  }
  if (r && r.categorie === 'adresse_ambigue') {
    const v = base(r, 'adresse_ambigue');
    v.titre = 'Cette adresse existe dans plusieurs villes';
    v.message =
      `Nous la trouvons à ${(r.villes ?? []).join(' et à ')}. Précisez la ville après une ` +
      `virgule, par exemple « ${adresseSaisie}, ${r.villes?.[0] ?? 'Montréal'} ».`;
    return v;
  }
  if (!r || r.categorie === 'introuvable') return introuvable(r, adresseSaisie);

  // Copropriété : plusieurs unités à l'adresse. Textes identiques à ceux du
  // moteur (pretri.phrase_partagee, phrase_appartement_inconnu).
  if (r.categorie === 'adresse_partagee') {
    const v = base(r, 'adresse_partagee');
    v.titre = 'Plusieurs unités partagent cette adresse';
    const n = r.n_unites ?? 0;
    const ville = r.couverture?.nom ? `, ${r.couverture.nom}` : '';
    const immeuble = r.unite?.adresse_base ?? r.unite?.adresse ?? adresseSaisie;
    if ((r.avec_appartements ?? 0) > 0 && r.appartement_exemple) {
      v.appartement_requis = true;
      v.message =
        `${n} unités d'évaluation sont inscrites à cette adresse : il s'agit sans doute ` +
        `d'une copropriété. Ajoutez votre numéro d'appartement pour que le tri retrouve ` +
        `votre unité, par exemple « ${immeuble}, app. ${r.appartement_exemple}${ville} ».`;
    } else {
      v.message =
        `${n} unités d'évaluation sont inscrites à cette adresse, et le rôle ne leur attribue ` +
        `pas de numéro d'appartement. Nous ne pouvons pas distinguer la vôtre automatiquement : ` +
        `écrivez-nous en indiquant le numéro de matricule inscrit sur votre compte de taxes.`;
    }
    return v;
  }
  if (r.categorie === 'appartement_inconnu') {
    const v = base(r, 'appartement_inconnu');
    v.titre = "Aucune unité ne porte ce numéro d'appartement";
    const n = r.n_unites ?? 0;
    const ville = r.couverture?.nom ? `, ${r.couverture.nom}` : '';
    const immeuble = r.unite?.adresse_base ?? r.unite?.adresse ?? adresseSaisie;
    if ((r.avec_appartements ?? 0) > 0) {
      v.message =
        `${n} unités d'évaluation sont inscrites à cette adresse, mais aucune ne porte le ` +
        `numéro d'appartement « ${r.appartement ?? ''} ». Numéros présents :`;
      v.pistes = (r.appartements_proches ?? []).map((a) => `${immeuble}, app. ${a}${ville}`);
    } else {
      v.message =
        `${n} unités d'évaluation sont inscrites à cette adresse, mais le rôle ne leur attribue ` +
        `pas de numéro d'appartement. Écrivez-nous en indiquant le numéro de matricule inscrit ` +
        `sur votre compte de taxes.`;
    }
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
  let commun =
    `Au rôle ${p.role_libelle}, votre immeuble passe de ${dollars(p.valeur_precedente)} ` +
    `à ${dollars(p.valeur_proposee)}, soit ${pct(p.hausse_pct)}. Les ${p.n_comparables} ` +
    `bâtiments comparables de votre secteur ont connu ${pct(med)} en médiane.`;
  const ecartPoints = p.hausse_pct - med;
  const uniforme = Boolean(p.sigma_plancher);
  if (uniforme) commun += ' ' + phraseUniforme(ecartPoints);
  if (p.taux) v.enjeu = phraseEnjeu(p.valeur_precedente, ecartPoints, p.taux);
  if (p.frais) v.frais_texte = phraseFrais(p.frais);

  if (r.categorie === 'avantageux') {
    v.titre = 'Votre évaluation est plus basse que celle de vos semblables';
    v.message =
      `${commun} Vous êtes nettement en dessous. À savoir : une demande de ` +
      `révision rouvre l'évaluation dans les deux sens, et l'évaluateur peut ` +
      `aussi la revoir à la hausse.`;
    return v;
  }

  if (r.categorie === 'conforme') {
    v.titre = 'Votre évaluation paraît dans la norme';
    const marge = uniforme
      ? "Un écart de moins de 2 points de pourcentage reste dans la marge d'arrondi de la méthode."
      : "L'écart reste dans la variation ordinaire entre immeubles semblables.";
    v.message =
      `${commun} ${marge} Sur le seul critère de la valeur, rien ne distingue ` +
      `votre évaluation de celles de vos comparables.`;
    v.reserve =
      "Ce tri ne regarde que la valeur par rapport aux comparables. L'état et les " +
      "particularités de votre immeuble entrent aussi dans son évaluation : une " +
      "conduite d'égout à remplacer ou des fondations à stabiliser, par exemple, " +
      "pèsent sur sa valeur réelle. Les chiffrer est le travail d'un évaluateur " +
      "agréé, pas le nôtre, mais ce sont des éléments qui peuvent être présentés à " +
      "l'évaluateur de la Ville lors d'une demande de révision, ou au Tribunal " +
      "administratif du Québec.";
    return v;
  }

  // defendable, solide, hors_proportions
  const cat = r.categorie as keyof typeof FORCE;
  v.rapport_recommande = true;
  v.titre = `Votre hausse ${FORCE[cat]}`;
  if (uniforme) {
    v.message = `${commun} Un écart de cette ampleur est inhabituel entre bâtiments comparables.`;
  } else {
    const rang =
      p.centile != null
        ? `Vous vous situez au ${p.centile.toFixed(0)}ᵉ centile de votre secteur, à`
        : 'Vous vous situez à';
    v.message =
      `${commun} ${rang} ${sigma(e)} écarts-types de la médiane. Un écart de cette ` +
      `ampleur est inhabituel entre bâtiments comparables.`;
  }
  v.reserve = RESERVE_VENTE;
  return v;
}
