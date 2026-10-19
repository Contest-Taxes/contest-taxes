// Espace client : formes des lignes lues par le navigateur avec la session de
// l'usager (Row Level Security côté base).

export type Statut = 'nouveau' | 'ventes_recues' | 'en_analyse' | 'rapport_disponible' | 'ferme';

export const STATUTS: Record<Statut, string> = {
  nouveau: 'Dossier ouvert',
  ventes_recues: 'Ventes reçues',
  en_analyse: 'Analyse en cours',
  rapport_disponible: 'Rapport disponible',
  ferme: 'Dossier fermé',
};

/** Liseré des cartes et pastille de statut (système visuel, 2026-10-19). */
export const STYLE_STATUT: Record<Statut, { lisere: string; pastille: string }> = {
  nouveau: { lisere: 'border-l-[#a3a8a4]', pastille: 'bg-[#f0f1ef] text-ct-encre' },
  ventes_recues: { lisere: 'border-l-[#d97706]', pastille: 'bg-[#fff7e6] text-[#8a4b08]' },
  en_analyse: { lisere: 'border-l-[#d97706]', pastille: 'bg-[#fff7e6] text-[#8a4b08]' },
  rapport_disponible: { lisere: 'border-l-ct-vert', pastille: 'bg-ct-vert-pale text-ct-vert-fonce' },
  ferme: { lisere: 'border-l-[#c3c2b7]', pastille: 'bg-[#f0f1ef] text-ct-gris' },
};

/** Ce qui attend le client à chaque étape. */
export const PROCHAINE_ETAPE: Record<Statut, string> = {
  nouveau:
    'Prochaine étape : déposer les ventes comparables de votre secteur, celles que la Ville vous affiche. ' +
    'Si vous préférez que nous les relevions, dites-le dans les notes du dossier.',
  ventes_recues: 'Nous avons vos ventes. L’analyse commence ; vous serez avisé quand le rapport sera déposé ici.',
  en_analyse: 'Le rapport est en préparation. Il sera déposé dans ce dossier.',
  rapport_disponible: 'Votre rapport est prêt : téléchargez-le ci-dessous.',
  ferme: 'Ce dossier est fermé. Écrivez-nous pour le rouvrir.',
};

export interface Dossier {
  id: string;
  proprietaire?: string;
  ville: string | null;
  matricule?: string | null;
  adresse: string;
  unite?: InstantanePretri | null;
  statut: Statut;
  notes_client?: string | null;
  rapport_chemin: string | null;
  rapport_depose_le?: string | null;
  cree_le: string;
  maj_le: string;
}

/** Instantané du pré-tri au moment de l'ouverture du dossier. */
export interface InstantanePretri {
  categorie: string;
  titre: string;
  unite: { adresse: string; logements: number | null; annee_construction: number | null; categorie: string | null } | null;
  chiffres: { valeur_precedente: number; valeur_proposee: number; hausse_pct: number; secteur_mediane_pct: number | null; ecart_sigma: number | null; role_libelle: string | null } | null;
  couverture: { ville: string; nom: string; role_libelle: string | null } | null;
}

export interface Rapport {
  id: number;
  dossier_id: string;
  langue: 'fr' | 'en';
  chemin: string;
  nom_fichier: string;
  annee: number | null;
  depose_le: string;
  dossiers?: { adresse: string } | null;
}

/** « Fr-Rapport_Analyse_428-rue-Murphy_2026.pdf » */
export function nomFichierRapport(langue: 'fr' | 'en', adresse: string, annee: number): string {
  const slug = adresse.split(',')[0].trim().replace(/\s+/g, '-').replace(/[^\w\-À-ÿ]/g, '');
  return `${langue === 'fr' ? 'Fr' : 'En'}-Rapport_Analyse_${slug}_${annee}.pdf`;
}

export interface Vente {
  id: number;
  dossier_id: string;
  adresse: string;
  date_vente: string | null;
  prix: number | null;
  cree_le: string;
}

export interface MessageContact {
  id: number;
  cree_le: string;
  nom: string;
  courriel: string;
  adresse: string | null;
  message: string;
  traite: boolean;
}

export const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });

export const montant = (v: number) =>
  Math.round(v).toLocaleString('fr-CA').replace(/ | /g, ' ') + ' $';
