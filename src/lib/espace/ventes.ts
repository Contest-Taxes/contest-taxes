// Lecture des ventes collées par le client : une vente par ligne, dans l'ordre
// où la Ville les affiche (adresse, date, prix), séparées par des tabulations,
// des points-virgules ou de simples espaces. La date et le prix sont reconnus
// à leur forme ; le reste de la ligne est l'adresse.

export interface VenteSaisie {
  adresse: string;
  date: string | null;    // AAAA-MM-JJ
  prix: number | null;
  brut: string;
  probleme: string | null;
}

const RE_DATE_ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const RE_DATE_FR = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
// « 350 000 $ », « 350000 », « 350,000 », « 1 250 000,00 $ »
const RE_PRIX = /(?:^|[\s;\t|])(\d{1,3}(?:[   ,]\d{3})+(?:[.,]\d{2})?|\d{5,9}(?:[.,]\d{2})?)\s*\$?(?=$|[\s;\t|])/g;

export function analyserVentes(texte: string): VenteSaisie[] {
  return texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((brut) => {
      let reste = brut;
      let date: string | null = null;
      const iso = reste.match(RE_DATE_ISO);
      const fr = reste.match(RE_DATE_FR);
      if (iso) {
        date = iso[0];
        reste = reste.replace(iso[0], ' ');
      } else if (fr) {
        date = `${fr[3]}-${fr[2]}-${fr[1]}`;
        reste = reste.replace(fr[0], ' ');
      }
      let prix: number | null = null;
      const candidats = Array.from(reste.matchAll(RE_PRIX));
      if (candidats.length > 0) {
        const m = candidats[candidats.length - 1];       // le dernier nombre : le prix suit l'adresse
        const valeur = Number(m[1].replace(/[   ]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
        if (Number.isFinite(valeur) && valeur >= 10000) {
          prix = valeur;
          reste = reste.slice(0, m.index) + ' ' + reste.slice(m.index! + m[0].length);
        }
      }
      const adresse = reste.replace(/[\t;|]+/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,$]+$/g, '').trim();
      const probleme = !adresse
        ? 'adresse manquante'
        : prix === null
          ? 'prix non reconnu'
          : date === null
            ? 'date non reconnue (AAAA-MM-JJ)'
            : null;
      return { adresse, date, prix, brut, probleme };
    });
}
