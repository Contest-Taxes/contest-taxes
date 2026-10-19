import type { Categorie, FraisSql, ResultatSql, TauxSql, Verdict } from './types';
import type { Langue } from '@/lib/i18n/langue';

// Port de contestaxes.pretri.evaluer : mêmes catégories, mêmes phrases, mot
// pour mot en français, pour que le site et le moteur disent la même chose.
// L'anglais est une traduction tenue ici seulement. Les seuls textes propres au
// site sont ceux des adresses introuvables ou partagées, que le moteur
// formulait pour la console.

function formats(langue: Langue) {
  const fr = langue === 'fr';
  const milliers = (v: number) => String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, fr ? ' ' : ',');
  const dec = (v: number, d = 1) => (fr ? Math.abs(v).toFixed(d).replace('.', ',') : Math.abs(v).toFixed(d));
  return {
    pct: (v: number) => (v >= 0 ? '+' : '−') + dec(v) + (fr ? ' %' : '%'),
    dollars: (v: number) => (fr ? milliers(v) + ' $' : '$' + milliers(v)),
    sigma: (v: number) => dec(v),
    points: (v: number) =>
      fr ? `${dec(v)} point${Math.abs(v) >= 2 ? 's' : ''} de pourcentage`
         : `${dec(v)} percentage point${Math.abs(v) === 1 ? '' : 's'}`,
    taux: (v: number) => (fr ? v.toFixed(3).replace('.', ',') + ' %' : v.toFixed(3) + '%'),
    montant: (v: number) => {
      const cents = Math.abs(v - Math.round(v)) >= 0.005;
      const n = cents ? v.toFixed(2) : String(Math.round(v));
      const [e, c] = n.split('.');
      const ent = e.replace(/\B(?=(\d{3})+(?!\d))/g, fr ? ' ' : ',');
      return fr ? ent + (c ? ',' + c : '') + ' $' : '$' + ent + (c ? '.' + c : '');
    },
  };
}

const arrondir = (v: number) => Math.floor(v + 0.5);

/** Toutes les phrases, par langue. Le français est la référence (= moteur). */
function textes(langue: Langue, adresseSaisie: string) {
  const f = formats(langue);
  if (langue === 'fr') {
    return {
      f,
      motsCles: ['bâtiments comparables', 'écarts-types'] as [string, string],
      uniforme: (e: number) => {
        const debut = 'Dans votre secteur, la Ville a appliqué à peu près la même hausse à tous les bâtiments comparables : votre immeuble ';
        if (Math.abs(e) < 0.05) return debut + 'a reçu cette même hausse.';
        return debut + `se situe à ${f.points(e)} ${e > 0 ? 'au-dessus' : 'au-dessous'} de cette hausse.`;
      },
      frais: (fr: FraisSql) =>
        `Déposer une demande de révision à ${fr.nom} coûte ${f.montant(fr.frais)} pour un immeuble de cette valeur, selon le barème de ${fr.annee}.` +
        (fr.remboursement ? ' ' + fr.remboursement : ''),
      enjeu: (valeurPrecedente: number, e: number, tx: TauxSql) => {
        const cout = arrondir(valeurPrecedente * 0.01 * tx.taux_pct / 100);
        const ou = tx.niveau === 'arrondissement'
          ? `Au taux de taxation résidentiel de ${f.taux(tx.taux_pct)} en vigueur en ${tx.annee} dans ${tx.libelle}`
          : `Au taux global de taxation de ${f.taux(tx.taux_pct)} de ${tx.libelle} (données ${tx.annee} du ministère des Affaires municipales et de l'Habitation)`;
        let s = `${ou}, chaque point de pourcentage de hausse représente environ ${f.dollars(cout)} de taxes par année.`;
        if (e >= 0.05) {
          const parAn = arrondir(e * cout);
          s += ` Vos ${f.points(e)} de plus que vos comparables vous coûteraient donc près de ${f.dollars(parAn)} par année, soit environ ${f.dollars(3 * parAn)} sur les trois ans du rôle, si les taux restaient les mêmes.`;
        }
        return s;
      },
      reserveVente:
        "Un point que cette analyse préliminaire ne peut pas vérifier : si votre immeuble a été vendu vers 2024, la nouvelle valeur reflète sans doute le prix payé, et l'écart s'explique alors de lui-même.",
      force: { defendable: 'se distingue de celle de vos semblables', solide: 'se distingue nettement de celle de vos semblables', hors_proportions: 'est hors de proportion avec celle de vos semblables' },
      villeInconnue: (v: string) => ['Municipalité non reconnue', `Nous ne reconnaissons pas la municipalité « ${v} ». Vérifiez l'orthographe, ou entrez l'adresse sans la ville si l'immeuble est à Montréal.`],
      villeNonCouverte: (v: string | undefined) => ["Cette ville n'est pas encore couverte", `${v ?? 'Cette ville'} n'est pas encore dans notre base. Elle suivra au dépôt de son prochain rôle d'évaluation ; les villes couvertes sont indiquées sur la page d'accueil.`],
      ambigue: (villes: string[]) => ['Cette adresse existe dans plusieurs villes', `Nous la trouvons à ${villes.join(' et à ')}. Précisez la ville après une virgule, par exemple « ${adresseSaisie}, ${villes[0] ?? 'Montréal'} ».`],
      introuvable: 'Adresse introuvable',
      voieInconnuePistes: (voie: string) => `La voie « ${voie} » n'existe pas telle quelle. Voies approchantes :`,
      voieInconnue: (voie: string, nom: string) => `Aucune voie ne correspond à « ${voie} » à ${nom}. Si l'immeuble est dans une autre ville, ajoutez-la après une virgule.`,
      horsPlage: (voie: string, nom: string, lo: number, hi: number) => `La voie « ${voie} » existe à ${nom}, mais ses numéros civiques vont de ${lo} à ${hi}. Le numéro demandé est hors de cette plage : l'adresse appartient probablement à une autre municipalité. Si c'est le cas, ajoutez la ville après une virgule.`,
      numeroAbsent: (voie: string, nom: string, lo: number, hi: number) => `La voie « ${voie} » existe à ${nom} (numéros de ${lo} à ${hi}), mais aucune unité d'évaluation ne porte ce numéro. Numéros voisins présents :`,
      format: `« ${adresseSaisie} » n'a pas pu être découpée en numéro civique + voie. Format attendu : « 1482 Rue Marie-Anne Est ».`,
      partagee: 'Plusieurs unités partagent cette adresse',
      partageeAvec: (n: number, ex: string) => `${n} unités d'évaluation sont inscrites à cette adresse : il s'agit sans doute d'une copropriété. Ajoutez votre numéro d'appartement pour que le tri retrouve votre unité, par exemple « ${ex} ».`,
      partageeSans: (n: number) => `${n} unités d'évaluation sont inscrites à cette adresse, et le rôle ne leur attribue pas de numéro d'appartement. Nous ne pouvons pas distinguer la vôtre automatiquement : écrivez-nous en indiquant le numéro de matricule inscrit sur votre compte de taxes.`,
      appInconnu: "Aucune unité ne porte ce numéro d'appartement",
      appInconnuAvec: (n: number, app: string) => `${n} unités d'évaluation sont inscrites à cette adresse, mais aucune ne porte le numéro d'appartement « ${app} ». Numéros présents :`,
      appInconnuSans: (n: number) => `${n} unités d'évaluation sont inscrites à cette adresse, mais le rôle ne leur attribue pas de numéro d'appartement. Écrivez-nous en indiquant le numéro de matricule inscrit sur votre compte de taxes.`,
      piste: (base: string, app: string, ville: string) => `${base}, app. ${app}${ville}`,
      horsChamp: ['Hors du champ de cet outil', "Cette analyse préliminaire ne couvre que les immeubles résidentiels de cinq logements ou moins — la même catégorie que l'outil de comparables de la Ville. Écrivez-nous : une analyse reste possible, mais elle se prépare autrement."],
      modifie: (hausse: number) => ['Votre bâtiment a changé entre les deux rôles', `L'aire d'étages inscrite au rôle a changé d'un cycle à l'autre. La hausse de ${f.pct(hausse)} suit donc probablement des travaux d'agrandissement, et se compare mal à celle des immeubles restés identiques. Une analyse reste possible, mais cette analyse automatique ne peut pas trancher.`],
      indeterminable: ["Pas assez d'immeubles semblables pour trancher", "Votre secteur compte trop peu d'immeubles de même catégorie pour établir une comparaison fiable. Une analyse complète, fondée sur un voisinage élargi, reste possible."],
      commun: (role: string | null, prec: number, prop: number, hausse: number, n: number | null, med: number) =>
        `Au rôle ${role}, votre immeuble passe de ${f.dollars(prec)} à ${f.dollars(prop)}, soit ${f.pct(hausse)}. Les ${n} bâtiments comparables de votre secteur ont connu ${f.pct(med)} en médiane.`,
      avantageux: (commun: string) => ['Votre évaluation est plus basse que celle de vos semblables', `${commun} Vous êtes nettement en dessous. À savoir : une demande de révision rouvre l'évaluation dans les deux sens, et l'évaluateur peut aussi la revoir à la hausse.`],
      conformeTitre: 'Votre évaluation paraît dans la norme',
      margeUniforme: "Un écart de moins de 2 points de pourcentage reste dans la marge d'arrondi de la méthode.",
      margeOrdinaire: "L'écart reste dans la variation ordinaire entre immeubles semblables.",
      conformeFin: 'Sur le seul critère de la valeur, rien ne distingue votre évaluation de celles de vos comparables.',
      reserveEtat:
        "Cette analyse préliminaire ne regarde que la valeur par rapport aux comparables. L'état et les particularités de votre immeuble entrent aussi dans son évaluation : une conduite d'égout à remplacer ou des fondations à stabiliser, par exemple, pèsent sur sa valeur réelle. Les chiffrer est le travail d'un évaluateur agréé, pas le nôtre, mais ce sont des éléments qui peuvent être présentés à l'évaluateur de la Ville lors d'une demande de révision, ou au Tribunal administratif du Québec.",
      hausseTitre: (force: string) => `Votre hausse ${force}`,
      inhabituel: 'Un écart de cette ampleur est inhabituel entre bâtiments comparables.',
      rang: (centile: number | null) => (centile != null ? `Vous vous situez au ${centile.toFixed(0)}ᵉ centile de votre secteur, à` : 'Vous vous situez à'),
      ecartsTypes: 'écarts-types de la médiane.',
    };
  }
  return {
    f,
    motsCles: ['comparable buildings', 'standard deviations'] as [string, string],
    uniforme: (e: number) => {
      const debut = 'In your sector, the City applied roughly the same increase to all comparable buildings: your building ';
      if (Math.abs(e) < 0.05) return debut + 'received that same increase.';
      return debut + `sits ${f.points(e)} ${e > 0 ? 'above' : 'below'} that increase.`;
    },
    frais: (fr: FraisSql) =>
      `Filing an application for review with ${fr.nom} costs ${f.montant(fr.frais)} for a building of this value, under the ${fr.annee} fee schedule.` +
      (fr.remboursement ? ' ' + traduireRemboursement(fr.remboursement) : ''),
    enjeu: (valeurPrecedente: number, e: number, tx: TauxSql) => {
      const cout = arrondir(valeurPrecedente * 0.01 * tx.taux_pct / 100);
      const ou = tx.niveau === 'arrondissement'
        ? `At the residential tax rate of ${f.taux(tx.taux_pct)} in force in ${tx.annee} in ${tx.libelle}`
        : `At the aggregate tax rate of ${f.taux(tx.taux_pct)} for ${tx.libelle} (${tx.annee} data from the ministère des Affaires municipales et de l'Habitation)`;
      let s = `${ou}, each percentage point of increase represents about ${f.dollars(cout)} in taxes per year.`;
      if (e >= 0.05) {
        const parAn = arrondir(e * cout);
        s += ` Your ${f.points(e)} above your comparables would therefore cost you close to ${f.dollars(parAn)} per year, about ${f.dollars(3 * parAn)} over the three years of the roll, if rates stayed the same.`;
      }
      return s;
    },
    reserveVente:
      'One thing this preliminary analysis cannot check: if your building was sold around 2024, the new value most likely reflects the price paid, and the gap then explains itself.',
    force: { defendable: 'stands apart from that of similar buildings', solide: 'stands clearly apart from that of similar buildings', hors_proportions: 'is out of proportion with that of similar buildings' },
    villeInconnue: (v: string) => ['Municipality not recognised', `We do not recognise the municipality “${v}”. Check the spelling, or enter the address without the city if the building is in Montréal.`],
    villeNonCouverte: (v: string | undefined) => ['This city is not covered yet', `${v ?? 'This city'} is not in our database yet. It will follow when its next assessment roll is filed; covered cities are listed on the home page.`],
    ambigue: (villes: string[]) => ['This address exists in several cities', `We find it in ${villes.join(' and in ')}. Specify the city after a comma, for example “${adresseSaisie}, ${villes[0] ?? 'Montréal'}”.`],
    introuvable: 'Address not found',
    voieInconnuePistes: (voie: string) => `The street “${voie}” does not exist as written. Similar streets:`,
    voieInconnue: (voie: string, nom: string) => `No street matches “${voie}” in ${nom}. If the building is in another city, add it after a comma.`,
    horsPlage: (voie: string, nom: string, lo: number, hi: number) => `The street “${voie}” exists in ${nom}, but its civic numbers run from ${lo} to ${hi}. The number requested is outside that range: the address probably belongs to another municipality. If so, add the city after a comma.`,
    numeroAbsent: (voie: string, nom: string, lo: number, hi: number) => `The street “${voie}” exists in ${nom} (numbers ${lo} to ${hi}), but no assessment unit carries this number. Neighbouring numbers on file:`,
    format: `“${adresseSaisie}” could not be split into civic number + street. Expected format: “1482 Rue Marie-Anne Est”.`,
    partagee: 'Several units share this address',
    partageeAvec: (n: number, ex: string) => `${n} assessment units are registered at this address: most likely a condominium. Add your unit number so the analysis finds your unit, for example “${ex}”.`,
    partageeSans: (n: number) => `${n} assessment units are registered at this address, and the roll gives them no unit number. We cannot tell yours apart automatically: write to us with the matricule number printed on your tax bill.`,
    appInconnu: 'No unit carries this unit number',
    appInconnuAvec: (n: number, app: string) => `${n} assessment units are registered at this address, but none carries unit number “${app}”. Numbers on file:`,
    appInconnuSans: (n: number) => `${n} assessment units are registered at this address, but the roll gives them no unit number. Write to us with the matricule number printed on your tax bill.`,
    piste: (base: string, app: string, ville: string) => `${base}, app. ${app}${ville}`,
    horsChamp: ['Outside the scope of this tool', 'This preliminary analysis covers only residential buildings of five units or fewer, the same category as the City’s comparables tool. Write to us: an analysis remains possible, but it is prepared differently.'],
    modifie: (hausse: number) => ['Your building changed between the two rolls', `The floor area entered on the roll changed from one cycle to the next. The ${f.pct(hausse)} increase therefore probably follows an extension, and compares poorly with buildings that stayed the same. An analysis remains possible, but this automatic analysis cannot decide.`],
    indeterminable: ['Not enough similar buildings to decide', 'Your sector has too few buildings of the same category to support a reliable comparison. A full analysis, based on a wider neighbourhood, remains possible.'],
    commun: (role: string | null, prec: number, prop: number, hausse: number, n: number | null, med: number) =>
      `On the ${role} roll, your building goes from ${f.dollars(prec)} to ${f.dollars(prop)}, a change of ${f.pct(hausse)}. The ${n} comparable buildings in your sector saw ${f.pct(med)} at the median.`,
    avantageux: (commun: string) => ['Your assessment is lower than that of similar buildings', `${commun} You are well below. Note that an application for review reopens the assessment in both directions, and the assessor may also revise it upward.`],
    conformeTitre: 'Your assessment appears within the norm',
    margeUniforme: 'A gap of less than 2 percentage points stays within the rounding margin of the method.',
    margeOrdinaire: 'The gap stays within the ordinary variation between similar buildings.',
    conformeFin: 'On the criterion of value alone, nothing sets your assessment apart from those of your comparables.',
    reserveEtat:
      'This preliminary analysis only looks at value relative to comparables. The condition and particular features of your building also enter into its assessment: a sewer line to replace or foundations to stabilise, for example, weigh on its actual value. Putting figures on them is the work of a chartered appraiser, not ours, but they can be presented to the City’s assessor in an application for review, or to the Tribunal administratif du Québec.',
    hausseTitre: (force: string) => `Your increase ${force}`,
    inhabituel: 'A gap of this size is unusual between comparable buildings.',
    rang: (centile: number | null) => (centile != null ? `You are at the ${ordinal(centile)} percentile of your sector,` : 'You are'),
    ecartsTypes: 'standard deviations from the median.',
  };
}

function ordinal(n: number): string {
  const k = Math.round(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = k % 100;
  return k + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Les règles de remboursement viennent de la base en français ; les deux formes connues sont traduites. */
function traduireRemboursement(s: string): string {
  if (s.startsWith("Cette somme n'est pas remboursable")) return 'This amount is not refundable.';
  if (s.startsWith('Elle est remboursée')) return 'It is refunded if the assessor does not reply in writing within the time allowed.';
  return s;
}

/** Mots du verdict qui ouvrent les panneaux d'explication (comparables, écart-type). */
export function motsClesVerdict(langue: Langue): [string, string] {
  return textes(langue, '').motsCles;
}

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
    matricule: r.matricule ?? null,
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

export function verdict(r: ResultatSql, adresseSaisie: string, langue: Langue = 'fr'): Verdict {
  const v = calculer(r, adresseSaisie, langue);
  v.pistes = Array.from(new Set(v.pistes));   // jamais deux pistes identiques
  return v;
}

function calculer(r: ResultatSql, adresseSaisie: string, langue: Langue): Verdict {
  const T = textes(langue, adresseSaisie);
  const nomVille = r?.couverture?.nom ?? 'Montréal';

  if (r && r.categorie === 'ville_inconnue') {
    const v = base(r, 'ville_inconnue');
    [v.titre, v.message] = T.villeInconnue(r.ville ?? '');
    return v;
  }
  if (r && r.categorie === 'ville_non_couverte') {
    const v = base(r, 'ville_non_couverte');
    [v.titre, v.message] = T.villeNonCouverte(r.ville);
    return v;
  }
  if (r && r.categorie === 'adresse_ambigue') {
    const v = base(r, 'adresse_ambigue');
    [v.titre, v.message] = T.ambigue(r.villes ?? []);
    return v;
  }
  if (!r || r.categorie === 'introuvable') {
    const v = base(r, 'introuvable');
    v.titre = T.introuvable;
    const d = r?.diagnostic;
    switch (d?.cas) {
      case 'voie_inconnue':
        if (d.voies_proches && d.voies_proches.length > 0) {
          v.message = T.voieInconnuePistes(d.voie ?? '');
          v.pistes = d.voies_proches;
        } else {
          v.message = T.voieInconnue(d.voie ?? '', nomVille);
        }
        break;
      case 'hors_plage':
        v.message = T.horsPlage(d.voie ?? '', nomVille, d.plage?.[0] ?? 0, d.plage?.[1] ?? 0);
        break;
      case 'numero_absent':
        v.message = T.numeroAbsent(d.voie ?? '', nomVille, d.plage?.[0] ?? 0, d.plage?.[1] ?? 0);
        v.pistes = d.voisins ?? [];
        break;
      default:
        v.message = T.format;
    }
    return v;
  }

  // Copropriété : plusieurs unités à l'adresse.
  if (r.categorie === 'adresse_partagee') {
    const v = base(r, 'adresse_partagee');
    v.titre = T.partagee;
    const n = r.n_unites ?? 0;
    const ville = r.couverture?.nom ? `, ${r.couverture.nom}` : '';
    const immeuble = r.unite?.adresse_base ?? r.unite?.adresse ?? adresseSaisie;
    if ((r.avec_appartements ?? 0) > 0 && r.appartement_exemple) {
      v.appartement_requis = true;
      v.message = T.partageeAvec(n, T.piste(immeuble, r.appartement_exemple, ville));
    } else {
      v.message = T.partageeSans(n);
    }
    return v;
  }
  if (r.categorie === 'appartement_inconnu') {
    const v = base(r, 'appartement_inconnu');
    v.titre = T.appInconnu;
    const n = r.n_unites ?? 0;
    const ville = r.couverture?.nom ? `, ${r.couverture.nom}` : '';
    const immeuble = r.unite?.adresse_base ?? r.unite?.adresse ?? adresseSaisie;
    if ((r.avec_appartements ?? 0) > 0) {
      v.message = T.appInconnuAvec(n, r.appartement ?? '');
      v.pistes = (r.appartements_proches ?? []).map((a) => T.piste(immeuble, a, ville));
    } else {
      v.message = T.appInconnuSans(n);
    }
    return v;
  }

  if (r.categorie === 'hors_champ') {
    const v = base(r, 'hors_champ');
    [v.titre, v.message] = T.horsChamp;
    return v;
  }

  const p = r.pretri;
  if (!p) {
    const v = base(r, 'introuvable');
    v.titre = T.introuvable;
    v.message = T.format;
    return v;
  }
  const v = base(r, r.categorie);

  if (r.categorie === 'batiment_modifie') {
    [v.titre, v.message] = T.modifie(p.hausse_pct);
    return v;
  }
  if (r.categorie === 'indeterminable' || p.ecart_sigma == null) {
    v.categorie = 'indeterminable';
    [v.titre, v.message] = T.indeterminable;
    return v;
  }

  const e = p.ecart_sigma;
  const med = p.secteur_mediane_pct ?? 0;
  let commun = T.commun(p.role_libelle, p.valeur_precedente, p.valeur_proposee, p.hausse_pct, p.n_comparables, med);
  const ecartPoints = p.hausse_pct - med;
  const uniforme = Boolean(p.sigma_plancher);
  if (uniforme) commun += ' ' + T.uniforme(ecartPoints);
  if (p.taux) v.enjeu = T.enjeu(p.valeur_precedente, ecartPoints, p.taux);
  if (p.frais) v.frais_texte = T.frais(p.frais);

  if (r.categorie === 'avantageux') {
    [v.titre, v.message] = T.avantageux(commun);
    return v;
  }
  if (r.categorie === 'conforme') {
    v.titre = T.conformeTitre;
    const marge = uniforme ? T.margeUniforme : T.margeOrdinaire;
    v.message = `${commun} ${marge} ${T.conformeFin}`;
    v.reserve = T.reserveEtat;
    return v;
  }

  // defendable, solide, hors_proportions
  const cat = r.categorie as keyof typeof T.force;
  v.rapport_recommande = true;
  v.titre = T.hausseTitre(T.force[cat]);
  if (uniforme) {
    v.message = `${commun} ${T.inhabituel}`;
  } else {
    v.message = `${commun} ${T.rang(p.centile)} ${T.f.sigma(e)} ${T.ecartsTypes} ${T.inhabituel}`;
  }
  v.reserve = T.reserveVente;
  return v;
}
