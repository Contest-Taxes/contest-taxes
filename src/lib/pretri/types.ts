// Forme du JSON rendu par la fonction SQL public.pretri_chercher(adresse).
// Une seule source de vérité pour les seuils : la base. Ici, les textes.

export type Categorie =
  | 'avantageux' | 'conforme' | 'defendable' | 'solide' | 'hors_proportions'
  | 'batiment_modifie' | 'indeterminable' | 'hors_champ' | 'adresse_partagee' | 'introuvable'
  | 'ville_inconnue' | 'ville_non_couverte' | 'adresse_ambigue';

export interface UniteSql {
  /** Code géographique MAMH de la ville (66023 = Montréal). */
  ville?: string | null;
  adresse: string;
  logements: number | null;
  categorie: string | null;
  utilisation: string | null;
  annee_construction: number | null;
  etages: number | null;
  division: string | null;
}

export interface PretriSql {
  role_libelle: string | null;
  valeur_precedente: number;
  valeur_proposee: number;
  hausse_pct: number;
  secteur_mediane_pct: number | null;
  ecart_sigma: number | null;
  centile: number | null;
  n_comparables: number | null;
  comparaison: string | null;
  batiment_modifie: boolean;
  /** Secteur uniforme : dispersion ramenée au plancher de 2 points, l'écart se lit en points de pourcentage. */
  sigma_plancher?: boolean;
  arrondissement?: string | null;
  taux?: TauxSql | null;
  frais?: FraisSql | null;
}

export interface FraisSql {
  /** Somme exigée au dépôt d'une demande de révision pour un immeuble de cette valeur. */
  frais: number;
  annee: number;
  nom: string;
  remboursement?: string | null;
  source_libelle: string;
  source_url: string;
}

export interface CouvertureSql {
  ville: string;
  nom: string;
  millesime: number;
  role_libelle: string | null;
  apercu: boolean;
  note: string | null;
  immeubles?: number;
}

export interface TauxSql {
  annee: number;
  /** En % de la valeur (= $ par 100 $ d'évaluation). */
  taux_pct: number;
  libelle: string;
  niveau: 'arrondissement' | 'municipalite';
  source_libelle: string;
  source_url: string;
}

export interface GroupeSql {
  /** '500 m', '1 km', '5 km' (comparables par distance) ou 'cellule et logements' / 'cellule' (maille de repli). */
  niveau: string;
  rayon_m: number | null;
  division: string;
  /** Classe du sujet et de ses comparables : condo, maison (1 logement) ou plex (2 et plus) ; nul pour les tables d'avant 2026-10-13. */
  classe: 'condo' | 'maison' | 'plex' | null;
  logements: number | null;
  aire_sujet_m2: number | null;
  n: number;
  etages: [number | null, number | null];
  annees: [number | null, number | null];
  aire_m2: [number | null, number | null];
  etendue_m: number | null;
  rues: string[];
  /** Hausses du groupe en écarts-types autour de la médiane, par pas de 0,25 σ de −4 à +4. */
  histogramme: { de: number; a: number; pas: number; comptes: number[]; sous: number; sur: number } | null;
}

export interface DiagnosticSql {
  cas: 'format' | 'voie_inconnue' | 'hors_plage' | 'numero_absent';
  voie?: string;
  voies_proches?: string[];
  plage?: [number, number];
  voisins?: string[];
}

export interface ResultatSql {
  trouve: boolean;
  categorie: Categorie;
  matricule?: string;
  unite?: UniteSql;
  pretri?: PretriSql;
  rapport_recommande?: boolean;
  groupe?: GroupeSql | null;
  n_unites?: number;
  /** Ville nommée après la virgule, quand elle est inconnue ou pas encore couverte. */
  ville?: string;
  ville_code?: string;
  /** Villes chargées qui contiennent toutes cette adresse (catégorie adresse_ambigue). */
  villes?: string[];
  /** Table consultée : ville, rôle, et si c'est un aperçu (période de révision close). */
  couverture?: CouvertureSql | null;
  diagnostic?: DiagnosticSql;
}

export interface TransitionSql {
  millesime: number;
  role_libelle: string | null;
  valeur_avant: number | null;
  valeur_apres: number | null;
  hausse_pct: number | null;
  mediane_pct: number | null;
  ecart_sigma: number | null;
  n_comparables: number | null;
  rayon_m: number | null;
  batiment_modifie: boolean;
}

export interface Verdict {
  categorie: Categorie;
  trouve: boolean;
  rapport_recommande: boolean;
  titre: string;
  message: string;
  reserve: string;
  /** Lignes supplémentaires (voies approchantes, numéros voisins), à afficher en liste. */
  pistes: string[];
  unite: UniteSql | null;
  chiffres: PretriSql | null;
  groupe: GroupeSql | null;
  /** Transitions de rôle de l'immeuble, de la plus ancienne à la plus récente (courante comprise). */
  historique: TransitionSql[];
  /** Ce qu'un point de hausse coûte en taxes, au taux de l'immeuble, avec sa source. */
  enjeu: string;
  taux: TauxSql | null;
  couverture: CouvertureSql | null;
  /** Frais de dépôt d'une demande de révision, rapportés au coût d'un point. */
  frais_texte: string;
  frais: FraisSql | null;
}
