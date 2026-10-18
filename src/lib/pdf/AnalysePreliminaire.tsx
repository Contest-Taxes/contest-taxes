import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font, Svg, Path, Line, Polygon, Circle, Text as SvgText } from '@react-pdf/renderer';
import type { Verdict } from '@/lib/pretri/types';
import type { Langue } from '@/lib/i18n/langue';
import { decrireComparables } from '@/lib/pretri/comparables';
import { formaterUneSur, legendeSigma, phi, uneSur } from '@/components/CourbeSigma';
import { lectureHistorique, pointsHistorique, teinteHistorique, COULEURS_HISTORIQUE } from '@/components/CourbeHistorique';

// Analyse préliminaire en PDF : le contenu du verdict de la page d'accueil,
// mis en page comme le rapport payant (bandeau de marque, sections numérotées,
// courbe de l'écart, historique, sources). Polices standard du PDF (Helvetica) :
// pas de glyphe sigma ni de signe moins typographique, on les remplace.

Font.registerHyphenationCallback((mot) => [mot]);

const ENCRE = '#1e2223', GRIS = '#5b6360', LIGNE = '#e4e6e2', ROUGE = '#ba2a24';
const TEINTE: Record<string, { fond: string; bord: string }> = {
  avantageux: { fond: '#ecfdf5', bord: '#a7f3d0' },
  conforme: { fond: '#ecfdf5', bord: '#a7f3d0' },
  defendable: { fond: '#fffbeb', bord: '#fcd34d' },
  solide: { fond: '#fff7ed', bord: '#fdba74' },
  hors_proportions: { fond: '#fef2f2', bord: '#fca5a5' },
};

const S = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 54, fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.45, color: ENCRE },
  marque: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: LIGNE, paddingBottom: 8, marginBottom: 18 },
  marqueGauche: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 23 },
  nom: { fontSize: 18, fontWeight: 700 },
  marqueDroite: { fontSize: 8.5, color: GRIS, textAlign: 'right' },
  titre: { fontSize: 19, fontWeight: 700, lineHeight: 1.25 },
  sousTitre: { fontSize: 12.5, marginTop: 4 },
  meta: { fontSize: 9, color: GRIS, marginTop: 6 },
  h2: { fontSize: 12.5, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  p: { marginBottom: 6, textAlign: 'justify' },
  petit: { fontSize: 8.5, color: GRIS, lineHeight: 1.4 },
  encadre: { borderWidth: 1, borderRadius: 6, padding: 10, marginTop: 10 },
  verdictTitre: { fontSize: 13, fontWeight: 700, marginBottom: 5 },
  table: { marginTop: 4, borderTopWidth: 1, borderTopColor: LIGNE },
  ligne: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LIGNE, paddingVertical: 4 },
  cle: { width: '48%', color: GRIS },
  val: { width: '52%', fontWeight: 700 },
  legende: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  pastille: { width: 8, height: 8, marginTop: 2, marginRight: 6, borderWidth: 0.5, borderColor: '#9aa' },
  pied: { position: 'absolute', bottom: 28, left: 54, right: 54, fontSize: 7.5, color: GRIS, borderTopWidth: 0.5, borderTopColor: LIGNE, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
});

// Caractères absents des polices standard du PDF.
const nettoyer = (s: string, langue: Langue) =>
  s.replace(/−/g, '-').replace(/—/g, '-').replace(/ᵉ/g, 'e').replace(/σ/g, langue === 'fr' ? 'écart-type' : 'SD').replace(/[  ]/g, ' ');

function formats(langue: Langue) {
  const fr = langue === 'fr';
  const milliers = (v: number) => String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, fr ? ' ' : ',');
  return {
    dollars: (v: number) => (fr ? `${milliers(v)} $` : `$${milliers(v)}`),
    pct: (v: number) => (v >= 0 ? '+' : '-') + (fr ? Math.abs(v).toFixed(1).replace('.', ',') + ' %' : Math.abs(v).toFixed(1) + '%'),
    dec: (v: number) => (v >= 0 ? '+' : '-') + (fr ? Math.abs(v).toFixed(1).replace('.', ',') : Math.abs(v).toFixed(1)),
    date: (d: Date) => d.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

const L = 340, H = 170, G = 18, D = 18, HAUT = 32, BAS = 34, XMAX = 4;
const px = (x: number) => G + ((x + XMAX) / (2 * XMAX)) * (L - G - D);
const py = (h: number) => H - BAS - h * (H - BAS - HAUT);
const dens = (x: number) => Math.exp(-0.5 * x * x);
function aire(de: number, a: number) {
  const pts: string[] = [];
  for (let x = de; x <= a + 1e-9; x += 0.05) pts.push(`${px(x).toFixed(1)},${py(dens(x)).toFixed(1)}`);
  return `M${px(de).toFixed(1)},${py(0).toFixed(1)} L${pts.join(' L')} L${px(a).toFixed(1)},${py(0).toFixed(1)} Z`;
}
function courbe() {
  const pts: string[] = [];
  for (let x = -XMAX; x <= XMAX + 1e-9; x += 0.05) pts.push(`${px(x).toFixed(1)},${py(dens(x)).toFixed(1)}`);
  return `M${pts.join(' L')}`;
}

function Cloche({ ecart, langue }: { ecart: number; langue: Langue }) {
  const fr = langue === 'fr';
  const f = formats(langue);
  const xs = Math.max(-3.7, Math.min(3.7, ecart));
  const hors = Math.abs(ecart) > 3.7;
  const etiquette = `${fr ? 'vous' : 'you'} : ${f.dec(ecart)}`;
  const ancre = xs > 2 ? 'end' : xs < -2 ? 'start' : 'middle';
  return (
    <Svg viewBox={`0 0 ${L} ${H}`} style={{ width: 340, height: 170 }}>
      {[{ de: 0, a: 1, c: '#6da7ec' }, { de: 1, a: 2, c: '#9ec5f4' }, { de: 2, a: 3, c: '#cde2fb' }].map((b) => (
        <React.Fragment key={b.de}>
          <Path d={aire(b.de, b.a)} fill={b.c} />
          <Path d={aire(-b.a, -b.de)} fill={b.c} />
        </React.Fragment>
      ))}
      <Path d={courbe()} fill="none" stroke="#184f95" strokeWidth={1.5} />
      <Line x1={G} y1={py(0)} x2={L - D} y2={py(0)} stroke="#c3c2b7" strokeWidth={1} />
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <React.Fragment key={k}>
          <Line x1={px(k)} y1={py(0)} x2={px(k)} y2={py(0) + 4} stroke="#898781" strokeWidth={1} />
          <SvgText x={px(k)} y={py(0) + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#52514e' }}>
            {k === 0 ? (fr ? 'médiane' : 'median') : `${k > 0 ? '+' : '-'}${Math.abs(k)}`}
          </SvgText>
        </React.Fragment>
      ))}
      <SvgText x={px(0)} y={H - 6} textAnchor="middle" style={{ fontSize: 8, fill: '#898781' }}>
        {fr ? 'hausse des comparables, en écarts-types autour de la médiane' : 'increase of the comparables, in standard deviations around the median'}
      </SvgText>
      <Line x1={px(xs)} y1={HAUT - 6} x2={px(xs)} y2={py(0)} stroke="#0b0b0b" strokeWidth={1.5} strokeDasharray={hors ? '4 3' : undefined} />
      <Polygon points={`${px(xs)},${HAUT - 14} ${px(xs) - 5},${HAUT - 4} ${px(xs) + 5},${HAUT - 4}`} fill="#0b0b0b" />
      <SvgText x={px(xs)} y={HAUT - 18} textAnchor={ancre} style={{ fontSize: 10, fill: '#0b0b0b', fontWeight: 700 }}>{etiquette}</SvgText>
    </Svg>
  );
}

function Historique({ v, langue }: { v: Verdict; langue: Langue }) {
  const fr = langue === 'fr';
  const f = formats(langue);
  const points = pointsHistorique(v.historique);
  if (points.length < 2) return null;
  const LECTURE = lectureHistorique(langue);
  const L2 = 360, H2 = 150, G2 = 14, D2 = 14, HAUT2 = 26, BAS2 = 32;
  const vals = points.map((p) => p.valeur);
  const vmin = Math.min(...vals) * 0.9, vmax = Math.max(...vals) * 1.06;
  const px2 = (i: number) => G2 + 28 + (i / (points.length - 1)) * (L2 - G2 - D2 - 56);
  const py2 = (val: number) => H2 - BAS2 - ((val - vmin) / (vmax - vmin)) * (H2 - BAS2 - HAUT2);
  const trace = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px2(i).toFixed(1)},${py2(p.valeur).toFixed(1)}`).join(' ');
  const argent = (val: number) => (val >= 1e6 ? `${(val / 1e6).toFixed(2).replace('.', fr ? ',' : '.')} M$` : `${Math.round(val / 1000)} k$`);
  return (
    <View wrap={false}>
      <Svg viewBox={`0 0 ${L2} ${H2}`} style={{ width: 360, height: 150 }}>
        <Line x1={G2} y1={H2 - BAS2} x2={L2 - D2} y2={H2 - BAS2} stroke="#c3c2b7" strokeWidth={1} />
        <Path d={trace} fill="none" stroke="#184f95" strokeWidth={1.5} />
        {points.map((p, i) => {
          const k = teinteHistorique(p.ecart, p.modifie);
          return (
            <React.Fragment key={p.annee}>
              <Circle cx={px2(i)} cy={py2(p.valeur)} r={4.5} fill={COULEURS_HISTORIQUE[k]} stroke="#fff" strokeWidth={1.5} />
              <SvgText x={px2(i)} y={py2(p.valeur) - 9} textAnchor="middle" style={{ fontSize: 9, fill: ENCRE, fontWeight: 700 }}>{argent(p.valeur)}</SvgText>
              <SvgText x={px2(i)} y={H2 - BAS2 + 13} textAnchor="middle" style={{ fontSize: 9, fill: '#52514e' }}>{String(p.annee)}</SvgText>
              {p.hausse != null && i > 0 && (
                <SvgText x={(px2(i) + px2(i - 1)) / 2} y={H2 - BAS2 + 25} textAnchor="middle" style={{ fontSize: 8.5, fill: COULEURS_HISTORIQUE[k], fontWeight: 700 }}>{f.pct(p.hausse)}</SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={S.table}>
        {points.slice(1).map((p) => {
          const k = teinteHistorique(p.ecart, p.modifie);
          return (
            <View key={p.annee} style={S.ligne}>
              <Text style={S.cle}>{fr ? 'Rôle' : 'Roll'} {p.annee}{p.hausse != null ? ` : ${f.pct(p.hausse)}` : ''}</Text>
              <Text style={{ width: '52%' }}>
                {LECTURE[k]}{p.ecart != null && !p.modifie ? ` (${f.dec(p.ecart)} ${fr ? 'écart-type' : 'SD'}, ${p.n} ${fr ? 'comparables' : 'comparables'})` : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export interface ProprietesAnalyse {
  verdict: Verdict;
  adresse: string;
  langue: Langue;
  logo: Buffer | null;
  genereLe: Date;
}

export function DocumentAnalyse({ verdict: v, adresse, langue, logo, genereLe }: ProprietesAnalyse) {
  const fr = langue === 'fr';
  const f = formats(langue);
  const c = v.chiffres;
  const u = v.unite;
  const ville = v.couverture?.nom ?? '';
  const role = c?.role_libelle ?? v.couverture?.role_libelle ?? '';
  const adresseComplete = (u?.adresse ?? adresse) + (ville ? `, ${ville}` : '');
  const teinte = TEINTE[v.categorie] ?? { fond: '#ffffff', bord: LIGNE };
  const n = (s: string) => nettoyer(s, langue);
  const e = c?.ecart_sigma ?? null;
  const comp = v.groupe ? decrireComparables(v.groupe, langue) : null;
  let k = 1;
  const num = () => `${k++}. `;

  const T = fr ? {
    doc: 'Analyse préliminaire de l’évaluation foncière',
    produit: `Analyse préliminaire produite le ${f.date(genereLe)} par Contest-Taxes, à partir des rôles d’évaluation foncière publiés par le ministère des Affaires municipales et de l’Habitation${ville === 'Montréal' ? ' et des données ouvertes de la Ville de Montréal' : ''}. Document en français.`,
    immeuble: 'L’immeuble', chiffres: 'Les chiffres', lecture: 'Ce que cela signifie', comparables: 'Les bâtiments comparables', ecart: 'Lire l’écart', taxes: 'Ce que cela représente en taxes', histo: 'L’immeuble au fil des rôles', limites: 'Ce que cette analyse ne voit pas', suite: 'Et ensuite',
    rolePrec: 'Valeur au rôle précédent', roleNouv: `Valeur au rôle ${role}`, hausse: 'Hausse', mediane: 'Hausse médiane des comparables', nComp: 'Bâtiments comparables', ecartLib: 'Écart, en écarts-types', centile: 'Rang parmi les comparables',
    logement: 'logement', logements: 'logements', construit: 'construit en', type: 'Type',
    uneSur: (e: number) => `À ${f.dec(e)} écart-type, ${formaterUneSur(uneSur(e), 'fr')} se situe aussi loin au-dessus de la médiane, si les hausses suivaient une loi normale. Les bandes bleues valent 1, 2 et 3 écarts-types de part et d’autre de la médiane ; fréquences lues vers le haut.`,
    sousMediane: 'L’immeuble est sous la médiane de son secteur : la question d’une hausse élevée ne se pose pas.',
    limite1: '« Dans la norme » veut dire « rien d’inhabituel par rapport aux voisins », pas « juste ». Si tout un secteur est surévalué, seules les ventes réelles le montrent. Et après une vente récente, la nouvelle valeur reflète souvent le prix payé.',
    limite2: 'Cette analyse compare des valeurs inscrites au rôle, pas des prix de vente, et n’ajuste ni pour l’âge ni pour l’état. Elle n’est pas une évaluation professionnelle.',
    suiteTexte: 'Une demande de révision s’appuie sur les prix de vente de propriétés comparables, pas sur les valeurs au rôle des voisins : les municipalités l’indiquent elles-mêmes. C’est l’analyse que fait le rapport complet, à partir des ventes du secteur. Pour aller plus loin : contest-taxes.ca.',
    sourceTaux: 'Source du taux :', sourceFrais: 'Source des frais :',
    pied: 'Contest-Taxes · contest-taxes.ca · Analyse statistique des évaluations foncières · Pas une évaluation professionnelle',
    page: (p: number, t: number) => `page ${p} de ${t}`,
    vous: '← vous',
  } : {
    doc: 'Preliminary analysis of the property assessment',
    produit: `Preliminary analysis produced on ${f.date(genereLe)} by Contest-Taxes, from the assessment rolls published by the ministère des Affaires municipales et de l’Habitation${ville === 'Montréal' ? ' and Ville de Montréal open data' : ''}. Document in English.`,
    immeuble: 'The building', chiffres: 'The figures', lecture: 'What it means', comparables: 'The comparable buildings', ecart: 'Reading the deviation', taxes: 'What it represents in taxes', histo: 'The building across the rolls', limites: 'What this analysis cannot see', suite: 'What comes next',
    rolePrec: 'Value on the previous roll', roleNouv: `Value on the ${role} roll`, hausse: 'Increase', mediane: 'Median increase of the comparables', nComp: 'Comparable buildings', ecartLib: 'Deviation, in standard deviations', centile: 'Rank among the comparables',
    logement: 'unit', logements: 'units', construit: 'built in', type: 'Type',
    uneSur: (e: number) => `At ${f.dec(e)} standard deviations, ${formaterUneSur(uneSur(e), 'en')} sits this far above the median, if increases followed a normal distribution. The blue bands are 1, 2 and 3 standard deviations on either side of the median; frequencies read upward.`,
    sousMediane: 'The building is below the median of its sector: the question of a high increase does not arise.',
    limite1: '“Within the norm” means “nothing unusual compared with the neighbours”, not “fair”. If a whole sector is overassessed, only actual sales show it. And after a recent sale, the new value often reflects the price paid.',
    limite2: 'This analysis compares values entered on the roll, not sale prices, and adjusts neither for age nor for condition. It is not a professional appraisal.',
    suiteTexte: 'A request for review rests on the sale prices of comparable properties, not on the neighbours’ roll values: municipalities say so themselves. That is the analysis the full report performs, from the sales in the sector. To go further: contest-taxes.ca.',
    sourceTaux: 'Rate source:', sourceFrais: 'Fee source:',
    pied: 'Contest-Taxes · contest-taxes.ca · Statistical analysis of property assessments · Not a professional appraisal',
    page: (p: number, t: number) => `page ${p} of ${t}`,
    vous: '← you',
  };

  return (
    <Document title={`${T.doc} : ${adresseComplete}`} author="Contest-Taxes" language={langue}>
      <Page size="LETTER" style={S.page}>
        <View style={S.marque} fixed>
          <View style={S.marqueGauche}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- image de react-pdf, sans attribut alt */}
            {logo && <Image src={{ data: logo, format: 'png' }} style={S.logo} />}
            <Text style={S.nom}><Text style={{ color: ENCRE }}>Contest-</Text><Text style={{ color: ROUGE }}>Taxes</Text></Text>
          </View>
          <Text style={S.marqueDroite}>contest-taxes.ca{'\n'}{fr ? 'Analyse statistique des évaluations foncières' : 'Statistical analysis of property assessments'}</Text>
        </View>

        <Text style={S.titre}>{T.doc}</Text>
        <Text style={S.sousTitre}>{adresseComplete}</Text>
        <Text style={S.meta}>{n(T.produit)}</Text>

        <View style={[S.encadre, { backgroundColor: teinte.fond, borderColor: teinte.bord }]}>
          <Text style={S.verdictTitre}>{n(v.titre)}</Text>
          <Text style={S.p}>{n(v.message)}</Text>
          {v.reserve ? <Text style={[S.p, { fontSize: 9.5, color: GRIS, marginBottom: 0 }]}>{n(v.reserve)}</Text> : null}
        </View>

        <Text style={S.h2}>{num()}{T.immeuble}</Text>
        <View style={S.table}>
          <View style={S.ligne}><Text style={S.cle}>{fr ? 'Adresse' : 'Address'}</Text><Text style={S.val}>{adresseComplete}</Text></View>
          {u?.logements != null && <View style={S.ligne}><Text style={S.cle}>{fr ? 'Logements' : 'Units'}</Text><Text style={S.val}>{u.logements}</Text></View>}
          {u?.annee_construction != null && <View style={S.ligne}><Text style={S.cle}>{fr ? 'Année de construction' : 'Year built'}</Text><Text style={S.val}>{u.annee_construction}</Text></View>}
          {u?.categorie && <View style={S.ligne}><Text style={S.cle}>{T.type}</Text><Text style={S.val}>{u.categorie === 'Régulier' ? (fr ? 'Immeuble régulier' : 'Regular building') : u.categorie}</Text></View>}
          {v.matricule && <View style={S.ligne}><Text style={S.cle}>Matricule</Text><Text style={S.val}>{v.matricule}</Text></View>}
        </View>

        {c && (
          <>
            <Text style={S.h2}>{num()}{T.chiffres}</Text>
            <View style={S.table}>
              <View style={S.ligne}><Text style={S.cle}>{T.rolePrec}</Text><Text style={S.val}>{f.dollars(c.valeur_precedente)}</Text></View>
              <View style={S.ligne}><Text style={S.cle}>{T.roleNouv}</Text><Text style={S.val}>{f.dollars(c.valeur_proposee)}</Text></View>
              <View style={S.ligne}><Text style={S.cle}>{T.hausse}</Text><Text style={S.val}>{f.pct(c.hausse_pct)}</Text></View>
              {c.secteur_mediane_pct != null && <View style={S.ligne}><Text style={S.cle}>{T.mediane}</Text><Text style={S.val}>{f.pct(c.secteur_mediane_pct)}</Text></View>}
              {c.n_comparables != null && <View style={S.ligne}><Text style={S.cle}>{T.nComp}</Text><Text style={S.val}>{c.n_comparables}</Text></View>}
              {e != null && <View style={S.ligne}><Text style={S.cle}>{T.ecartLib}</Text><Text style={S.val}>{f.dec(e)}</Text></View>}
              {c.centile != null && <View style={S.ligne}><Text style={S.cle}>{T.centile}</Text><Text style={S.val}>{fr ? `${c.centile.toFixed(0)}e centile` : `${c.centile.toFixed(0)}th percentile`}</Text></View>}
            </View>
          </>
        )}

        {comp && (
          <>
            <Text style={S.h2}>{num()}{T.comparables}</Text>
            <Text style={S.p}>{n(comp.phrase)}</Text>
            {comp.details.length > 0 && (
              <View style={S.table}>
                {comp.details.map(([cle, val]) => <View key={cle} style={S.ligne}><Text style={S.cle}>{cle}</Text><Text style={S.val}>{n(val)}</Text></View>)}
              </View>
            )}
            <Text style={[S.petit, { marginTop: 5 }]}>{n(comp.note)}</Text>
          </>
        )}

        {e != null && (
          <View wrap={false}>
            <Text style={S.h2}>{num()}{T.ecart}</Text>
            <View style={{ alignItems: 'center', marginTop: 2 }}><Cloche ecart={e} langue={langue} /></View>
            <Text style={S.p}>{e > 0 ? n(T.uneSur(e)) : T.sousMediane}</Text>
            <View style={{ marginTop: 2 }}>
              {legendeSigma(langue).map((l) => {
                const ici = l.test(e);
                return (
                  <View key={l.bande} style={S.legende}>
                    <View style={[S.pastille, { backgroundColor: l.couleur }]} />
                    <Text style={{ fontSize: 9, fontWeight: ici ? 700 : 400 }}>{n(`${l.bande} : ${l.frequence}, ${l.lecture}${ici ? ` ${T.vous}` : ''}`)}</Text>
                  </View>
                );
              })}
            </View>
            {e > 0 && (
              <Text style={S.petit}>{fr ? `Au-delà de ${f.dec(e)} écart-type : ${((1 - phi(e)) * 100).toFixed(1).replace('.', ',')} % des évaluations d’une loi normale.` : `Beyond ${f.dec(e)} standard deviations: ${((1 - phi(e)) * 100).toFixed(1)}% of assessments under a normal distribution.`}</Text>
            )}
          </View>
        )}

        {(v.enjeu || v.frais_texte) && (
          <View wrap={false}>
            <Text style={S.h2}>{num()}{T.taxes}</Text>
            {v.enjeu ? <Text style={S.p}>{n(v.enjeu)}</Text> : null}
            {v.frais_texte ? <Text style={S.p}>{n(v.frais_texte)}</Text> : null}
            {v.taux && <Text style={S.petit}>{T.sourceTaux} {v.taux.source_libelle}, {v.taux.source_url}</Text>}
            {v.frais && <Text style={S.petit}>{T.sourceFrais} {v.frais.source_libelle}, {v.frais.source_url}</Text>}
          </View>
        )}

        {v.historique.length >= 1 && pointsHistorique(v.historique).length >= 2 && (
          <View wrap={false}>
            <Text style={S.h2}>{num()}{T.histo}</Text>
            <View style={{ alignItems: 'center' }}><Historique v={v} langue={langue} /></View>
          </View>
        )}

        <View wrap={false}>
          <Text style={S.h2}>{num()}{T.limites}</Text>
          <Text style={S.p}>{T.limite1}</Text>
          <Text style={S.p}>{T.limite2}</Text>
          <Text style={S.h2}>{num()}{T.suite}</Text>
          <Text style={S.p}>{T.suiteTexte}</Text>
        </View>

        <View style={S.pied} fixed>
          <Text>{T.pied}</Text>
          <Text render={({ pageNumber, totalPages }) => T.page(pageNumber, totalPages)} />
        </View>
      </Page>
    </Document>
  );
}
