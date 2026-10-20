'use client';
import { FormEvent, ReactNode, useState } from 'react';
import type { CouvertureSql, ExempleSql, GroupeSql, Verdict } from '@/lib/pretri/types';
import CourbeSigma, { COMPS, legendeSigma, formaterUneSur, partObservee, uneSur } from '@/components/CourbeSigma';
import CourbeHistorique from '@/components/CourbeHistorique';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { fmtNombre, t } from '@/lib/i18n/textes';
import type { Langue } from '@/lib/i18n/langue';
import { motsClesVerdict } from '@/lib/pretri/verdict';
import { decrireComparables } from '@/lib/pretri/comparables';
import { telechargerAnalysePdf } from '@/lib/pretri/pdfClient';

type Sujet = 'comparables' | 'sigma';

// Un mot du texte qui ouvre le panneau d'explication : au survol, au focus
// clavier, ou au toucher. Souligné en pointillé pour signaler qu'il répond.
function Declencheur({ sujet, ouvrir, actif, children }: {
  sujet: Sujet; ouvrir: (s: Sujet, epingler?: boolean) => void; actif: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => ouvrir(sujet)}
      onFocus={() => ouvrir(sujet)}
      onClick={() => ouvrir(sujet, true)}
      aria-expanded={actif}
      className={`cursor-help rounded-sm underline decoration-ct-vert decoration-dotted decoration-2 underline-offset-4 ${actif ? 'bg-ct-vert-pale' : ''}`}
    >
      {children}
    </button>
  );
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Le message du verdict est une chaîne identique à celle du moteur Python ;
// on y insère les déclencheurs sans en changer un mot.
function MessageAvecDeclencheurs({ texte, ouvrir, actif, mots }: {
  texte: string; ouvrir: (s: Sujet, epingler?: boolean) => void; actif: Sujet | null; mots: [string, string];
}) {
  const morceaux = texte.split(new RegExp(`(${echapper(mots[0])}|${echapper(mots[1])})`));
  return (
    <p className="mt-3 leading-relaxed">
      {morceaux.map((m, i) => {
        if (m === mots[0]) return <Declencheur key={i} sujet="comparables" ouvrir={ouvrir} actif={actif === 'comparables'}>{m}</Declencheur>;
        if (m === mots[1]) return <Declencheur key={i} sujet="sigma" ouvrir={ouvrir} actif={actif === 'sigma'}>{m}</Declencheur>;
        return <span key={i}>{m}</span>;
      })}
    </p>
  );
}

function PanneauComparables({ g, langue }: { g: GroupeSql; langue: Langue }) {
  const T = t(langue).formulaire;
  const d = decrireComparables(g, langue);
  return (
    <div>
      <h3 className="font-display text-[22px] font-medium">{T.compTitre}</h3>
      <p className="mt-2 text-sm leading-relaxed">{d.phrase}</p>
      {d.details.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {d.details.map(([k, v]) => <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd>{v}</dd></div>)}
        </dl>
      )}
      <p className="mt-3 text-xs leading-relaxed text-gray-600">{d.note}</p>
    </div>
  );
}

function PanneauSigma({ ecart, histo, superposer, setSuperposer, langue }: {
  ecart: number; histo: GroupeSql['histogramme'] | null; superposer: boolean; setSuperposer: (v: boolean) => void; langue: Langue;
}) {
  const T = t(langue).formulaire;
  const h = superposer ? histo : null;
  const sig = (v: number) => (v >= 0 ? '+' : '−') + fmtNombre(langue, Math.abs(v), 1);
  return (
    <div>
      <h3 className="font-display text-[22px] font-medium">{T.lireEcart}</h3>
      <p className="mt-2 text-sm leading-relaxed">{T.lireEcartTexte}</p>
      <div className="mt-3 rounded-lg border bg-white p-2">
        <CourbeSigma ecart={ecart} histo={h} langue={langue} />
      </div>
      {histo && (
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={superposer} onChange={(e) => setSuperposer(e.target.checked)} className="mt-0.5" />
          <span>
            {T.expSuper}{' '}
            <span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: COMPS, opacity: 0.7 }} />{' '}
            <span className="text-gray-500">{T.expMention}</span>
          </span>
        </label>
      )}
      {ecart > 0 ? (
        <p className="mt-3 text-sm leading-relaxed">
          {T.aSigma} <strong>{sig(ecart)} σ</strong>, {formaterUneSur(uneSur(ecart), langue)} {T.aSigmaSuite}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed">
          {T.sousMediane} <strong>{T.sousMedianeFort}</strong> {T.sousMedianeSuite}
        </p>
      )}
      <ul className="mt-3 space-y-1.5 text-xs leading-snug">
        {legendeSigma(langue).map((l) => {
          const ici = l.test(ecart);
          const obs = h ? partObservee(h, l.seuil) : null;
          return (
            <li key={l.bande} className={`flex gap-2 ${ici ? 'rounded-md bg-black/5 p-1.5 font-semibold' : 'text-gray-600'}`}>
              <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border" style={{ backgroundColor: l.couleur }} />
              <span>
                <strong>{l.bande}</strong> — {l.frequence} : {l.lecture}{ici ? ` ${T.vous}` : ''}
                {obs && (
                  <span className="ml-1 font-normal" style={{ color: COMPS }}> · {T.observe} {obs.n} {T.sur} {obs.total}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">{T.frequences}</p>
    </div>
  );
}

export default function PretriForm({ couverture, exemple }: { couverture: CouvertureSql[]; exemple: ExempleSql | null }) {
  const { langue } = useLangue();
  const T = t(langue).formulaire;
  const TA = t(langue).accueil;
  const [adresse, setAdresse] = useState('');
  const [adresseVerdict, setAdresseVerdict] = useState('');
  const [appartement, setAppartement] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [panneau, setPanneau] = useState<Sujet | null>(null);
  const [epingle, setEpingle] = useState(false);
  const [superposer, setSuperposer] = useState(false);
  const [pdfEnCours, setPdfEnCours] = useState(false);

  const nombre = (v: number, d = 0) => fmtNombre(langue, v, d);
  const pct = (v: number) => (v >= 0 ? '+' : '−') + nombre(Math.abs(v), 1) + (langue === 'fr' ? ' %' : '%');
  const sig = (v: number) => (v >= 0 ? '+' : '−') + nombre(Math.abs(v), 1) + ' σ';

  function ouvrir(s: Sujet, epingler = false) {
    if (epingler) {
      if (panneau === s && epingle) { setPanneau(null); setEpingle(false); return; }
      setEpingle(true);
    } else if (epingle) {
      return;
    }
    setPanneau(s);
  }

  async function chercher(a: string) {
    setChargement(true);
    setErreur(null);
    setVerdict(null);
    setPanneau(null);
    setEpingle(false);
    try {
      const rep = await fetch('/api/pretri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresse: a, langue }),
      });
      const corps = await rep.json();
      if (!rep.ok) setErreur(corps.erreur ?? T.erreur);
      else { setVerdict(corps as Verdict); setAdresseVerdict(a); }
    } catch {
      setErreur(T.erreurReseau);
    } finally {
      setChargement(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (adresse.trim()) chercher(adresse);
  }

  function suivrePiste(piste: string) {
    const m = adresse.trim().match(/^(\d+(?:\s*[-–]\s*\d+)?)\s+/);
    const nouvelle = /^\d/.test(piste) ? piste : `${m ? m[1] : ''} ${piste}`.trim();
    setAdresse(nouvelle);
    chercher(nouvelle);
  }

  function chercherUnite(num: string) {
    const nouvelle = `${adresse.trim().replace(/[\s,]+$/, '')}, app. ${num.trim()}`;
    setAdresse(nouvelle);
    chercher(nouvelle);
  }

  async function telechargerPdf() {
    if (!adresseVerdict) return;
    setPdfEnCours(true);
    setErreur(null);
    try {
      const erreurPdf = await telechargerAnalysePdf(adresseVerdict, langue);
      if (erreurPdf) setErreur(erreurPdf);
    } catch {
      setErreur(T.erreurReseau);
    } finally {
      setPdfEnCours(false);
    }
  }

  const c = verdict?.chiffres ?? null;
  const u = verdict?.unite ?? null;
  const g = verdict?.groupe ?? null;
  const peutExpliquer = Boolean(c && c.ecart_sigma != null);
  const mots = motsClesVerdict(langue);

  const BORD: Record<string, string> = {
    avantageux: 'border-l-ct-vert', conforme: 'border-l-ct-vert', defendable: 'border-l-amber-500',
    solide: 'border-l-orange-500', hors_proportions: 'border-l-ct-rouge',
  };
  const fr = langue === 'fr';
  const libelleRole = (c: CouvertureSql) => (c.role_libelle ? `${TA.role} ${c.role_libelle}` : `${TA.millesime} ${c.millesime}`);
  const liste = couverture.length ? couverture : [{ ville: '66023', nom: 'Montréal', millesime: 2026, role_libelle: '2026-2027-2028', apercu: false, note: null }];
  // Agglomération de Montréal (région 66 du MAMH) : une seule pastille pour ses villes,
  // la liste complète sous la barre de recherche (Guillaume, 2026-10-20).
  const agglo = liste.filter((c) => c.ville.startsWith('66'));
  const nomsAgglo = agglo.map((c) => c.nom).sort((x, y) => x.localeCompare(y, 'fr'));
  const badges: (CouvertureSql & { titre?: string })[] = [
    ...(agglo.length > 1
      ? [{ ...agglo.find((c) => c.ville === '66023')!, ville: 'agglo', apercu: agglo.every((c) => c.apercu),
           nom: fr ? `Agglomération de Montréal · ${agglo.length} villes` : `Montréal agglomeration · ${agglo.length} cities`,
           titre: nomsAgglo.join(', ') }]
      : agglo),
    ...liste.filter((c) => !c.ville.startsWith('66')),
  ];
  const et = fr ? ' et ' : ' and ';
  const listeAgglo = nomsAgglo.length > 1 ? nomsAgglo.slice(0, -1).join(', ') + et + nomsAgglo[nomsAgglo.length - 1] : nomsAgglo.join('');
  const dollarsAn = (v: number) => (fr ? `${nombre(v)} $ / an` : `$${nombre(v)} / yr`);
  const CHIFFRES_EXEMPLE: [string, string][] = exemple
    ? [
        [fr ? 'Hausse de l’immeuble' : 'Building’s increase', pct(exemple.hausse_pct)],
        [fr ? 'Médiane des comparables' : 'Median of the comparables', pct(exemple.mediane_pct)],
        [fr ? 'Bâtiments comparés' : 'Buildings compared', nombre(exemple.n_comparables)],
        [fr ? 'Chaque % de hausse' : 'Each 1% of increase', exemple.cout_pourcent != null ? dollarsAn(exemple.cout_pourcent) : '—'],
      ]
    : [];

  return (
    <div>
      <section className="bg-ct-encre pb-16 pt-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex flex-wrap gap-2">
              {badges.map((c) => (
                <p key={c.ville} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#e6ebe7]" title={c.titre}>
                  <span className={`h-1.5 w-1.5 rounded-full ${c.apercu ? 'bg-[#f2b44c]' : 'bg-[#6fcf74]'}`} aria-hidden="true" />
                  {c.nom} · {c.apercu ? `${TA.apercu}, ` : ''}{libelleRole(c)}
                </p>
              ))}
            </div>
            <h1 className="font-display text-[40px] font-medium leading-[1.08] tracking-tight sm:text-[52px] lg:text-[58px]">{TA.titre}</h1>
            <p className="text-justify text-lg leading-relaxed text-ct-clair hyphens-auto" lang={langue}>{TA.intro1}</p>
            <p className="text-justify leading-relaxed text-ct-clair hyphens-auto" lang={langue}>{TA.intro2}</p>
            <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-2.5 rounded-2xl bg-white p-2.5 sm:flex-row">
              <label className="sr-only" htmlFor="adresse">{T.label}</label>
              <input
                id="adresse"
                name="adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder={T.placeholder}
                autoComplete="street-address"
                maxLength={120}
                required
                className="min-w-0 flex-1 rounded-xl border border-ct-ligne px-4 py-3.5 text-lg text-ct-encre outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20"
              />
              <button
                type="submit"
                disabled={chargement}
                className="rounded-xl bg-ct-vert px-7 py-3.5 text-lg font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50"
              >
                {chargement ? T.recherche : T.verifier}
              </button>
            </form>
            <p className="text-sm text-[#b7bfba]">{T.aide}</p>
            {agglo.length > 1 && (
              <p className="text-sm text-[#b7bfba]">
                {fr ? 'Agglomération de Montréal : ' : 'Montréal agglomeration: '}{listeAgglo}.
              </p>
            )}
          </div>
          <aside className="flex flex-col gap-3.5 rounded-2xl border border-white/15 bg-white/[0.06] p-6 lg:col-span-5" aria-label={fr ? 'Ce que vous obtenez' : 'What you get'}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#9fd3a3]">{fr ? 'En une seconde' : 'In one second'}</p>
            {CHIFFRES_EXEMPLE.length > 0 && (
              <div className="grid grid-cols-2 gap-3.5">
                {CHIFFRES_EXEMPLE.map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.06] p-3.5">
                    <p className="text-xs text-[#b7bfba]">{k}</p>
                    <p className="mt-1 whitespace-nowrap font-display text-[28px] leading-none text-white sm:text-[32px]">{v}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[13px] leading-relaxed text-[#c9cfcb]">
              {exemple
                ? (fr
                    ? <>Exemple tiré au hasard parmi les immeubles de {exemple.ville} : le <strong className="font-semibold text-white">{exemple.adresse}</strong>. Entrez votre adresse : le verdict, les comparables retenus et la lecture de l’écart s’affichent sous la barre de recherche.</>
                    : <>Example drawn at random among the buildings of {exemple.ville}: <strong className="font-semibold text-white">{exemple.adresse}</strong>. Enter your address: the verdict, the comparables retained and the reading of the deviation appear under the search bar.</>)
                : (fr
                    ? 'Entrez votre adresse : la hausse de votre immeuble, la médiane de ses comparables, leur nombre et ce que chaque pourcent de hausse représente en taxes s’affichent sous la barre de recherche.'
                    : 'Enter your address: your building’s increase, the median of its comparables, how many there are and what each 1% of increase represents in taxes appear under the search bar.')}
            </p>
          </aside>
        </div>
      </section>

      {(erreur || verdict) && <div className="conteneur pb-0">
      {erreur && (
        <div role="alert" className="max-w-2xl rounded-xl border border-red-200 bg-ct-rouge-pale p-4 text-ct-rouge">{erreur}</div>
      )}

      {verdict && (
        <div className={`grid items-start gap-6 lg:grid-cols-12 ${erreur ? 'mt-6' : ''}`}>
          <section aria-live="polite" className={`flex flex-col gap-3.5 rounded-2xl border border-ct-ligne border-l-[6px] bg-white px-8 py-7 shadow-lg shadow-black/5 lg:col-span-8 ${BORD[verdict.categorie] ?? 'border-l-ct-ligne'}`}>
            {u && (
              <p className="text-sm text-ct-gris">
                {T.trouve} <strong className="text-ct-encre">{u.adresse}</strong>
                {u.logements != null && ` · ${u.logements} ${u.logements > 1 ? T.logements : T.logement}`}
                {u.annee_construction != null && ` · ${T.construit} ${u.annee_construction}`}
                {u.categorie && u.categorie !== 'Régulier' && ` · ${u.categorie}`}
              </p>
            )}
            {verdict.couverture?.apercu && verdict.couverture.note && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950" role="note">{verdict.couverture.note}</div>
            )}
            <h2 className="font-display text-[32px] font-medium leading-[1.15]">{verdict.titre}</h2>
            {verdict.categorie === 'conforme' && <p className="text-justify text-sm text-ct-gris">{T.poursuivreNormeNote}</p>}
            {peutExpliquer
              ? <MessageAvecDeclencheurs texte={verdict.message} ouvrir={ouvrir} actif={panneau} mots={mots} />
              : <p className="leading-relaxed">{verdict.message}</p>}

            {verdict.pistes.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {verdict.pistes.map((p, i) => (
                  <li key={`${i}-${p}`}>
                    <button type="button" onClick={() => suivrePiste(p)} className="rounded-full border border-ct-ligne bg-white px-3 py-1 text-sm transition hover:border-ct-vert hover:bg-ct-vert-pale">{p}</button>
                  </li>
                ))}
              </ul>
            )}

            {verdict.appartement_requis && (
              <form onSubmit={(e) => { e.preventDefault(); if (appartement.trim()) chercherUnite(appartement); }} className="flex flex-wrap items-end gap-3">
                <label className="text-sm text-gray-700">
                  {T.appartement}
                  <input name="appartement" value={appartement} onChange={(e) => setAppartement(e.target.value)} placeholder="316" maxLength={8} required
                    className="mt-1 block w-32 rounded-lg border border-ct-ligne px-3 py-2 text-base outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
                </label>
                <button type="submit" disabled={chargement} className="rounded-lg bg-ct-vert px-4 py-2 font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50">{T.verifierUnite}</button>
              </form>
            )}

            {c && c.ecart_sigma != null && (
              <dl className="mt-1 grid grid-cols-2 gap-3.5 text-sm sm:grid-cols-3">
                {[
                  [T.rolePrec, langue === 'fr' ? `${nombre(c.valeur_precedente)} $` : `$${nombre(c.valeur_precedente)}`, null],
                  [`${T.role} ${c.role_libelle}`, langue === 'fr' ? `${nombre(c.valeur_proposee)} $` : `$${nombre(c.valeur_proposee)}`, null],
                  [T.hausse, pct(c.hausse_pct), null],
                  [T.mediane, c.secteur_mediane_pct != null ? pct(c.secteur_mediane_pct) : '—', null],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-ct-fond p-3"><dt className="text-ct-gris">{k}</dt><dd className="mt-0.5 text-lg font-semibold">{v}</dd></div>
                ))}
                <div className="rounded-xl bg-ct-fond p-3">
                  <dt className="text-ct-gris"><Declencheur sujet="comparables" ouvrir={ouvrir} actif={panneau === 'comparables'}>{T.comparables}</Declencheur></dt>
                  <dd className="mt-0.5 text-lg font-semibold">{c.n_comparables ?? '—'}</dd>
                </div>
                <div className="rounded-xl bg-ct-fond p-3">
                  <dt className="text-ct-gris"><Declencheur sujet="sigma" ouvrir={ouvrir} actif={panneau === 'sigma'}>{T.ecart}</Declencheur></dt>
                  <dd className="mt-0.5 text-lg font-semibold">{sig(c.ecart_sigma)}</dd>
                </div>
              </dl>
            )}

            {verdict.enjeu && verdict.taux && (
              <div className="border-t border-ct-ligne pt-3.5">
                <p className="leading-relaxed">
                  {verdict.enjeu}
                  <sup className="ml-px text-[0.7em] leading-none"><a href="#note-taux" className="text-ct-vert hover:underline">1</a></sup>
                </p>
                {verdict.frais_texte && verdict.frais && (
                  <p className="mt-2 leading-relaxed">
                    {verdict.frais_texte}
                    <sup className="ml-px text-[0.7em] leading-none"><a href="#note-frais" className="text-ct-vert hover:underline">2</a></sup>
                  </p>
                )}
                <p id="note-taux" className="mt-3 text-xs leading-relaxed text-gray-500">
                  1. {T.noteTaux}{' '}
                  <a href={verdict.taux.source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre">{verdict.taux.source_libelle}</a>
                  . {verdict.taux.niveau === 'arrondissement' ? T.deArr : T.deMun} {T.noteTauxSuite}
                </p>
                {verdict.frais_texte && verdict.frais && (
                  <p id="note-frais" className="mt-1 text-xs leading-relaxed text-gray-500">
                    2. {T.noteFrais}{' '}
                    <a href={verdict.frais.source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre">{verdict.frais.source_libelle}</a>
                    . {T.noteFraisSuite}
                    {verdict.frais_agglomeration && (
                      <>
                        {' '}{T.noteAgglo} (
                        <a href={T.noteAggloUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre">{T.noteAggloLoi}</a>
                        ).
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            {verdict.reserve && <p className="border-t border-ct-ligne pt-3.5 leading-relaxed">{verdict.reserve}</p>}

            {verdict.historique.length >= 1 && (
              <div className="border-t border-ct-ligne pt-3.5">
                <h3 className="font-semibold">{T.histoTitre}</h3>
                <div className="mt-2 rounded-xl border border-ct-ligne bg-white p-2">
                  <CourbeHistorique historique={verdict.historique} langue={langue} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ct-gris">{T.histoNote}</p>
              </div>
            )}

            {c && (
              <div className="flex flex-col gap-3 border-t border-ct-ligne pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={telechargerPdf} disabled={pdfEnCours}
                    className="rounded-xl border border-ct-encre px-4 py-3 font-semibold text-ct-encre transition hover:bg-ct-fond disabled:opacity-50">
                    {pdfEnCours ? T.pdfEnCours : T.pdf}
                  </button>
                  <span className="text-xs text-ct-gris">{T.pdfNote}</span>
                </div>
                {(verdict.rapport_recommande || verdict.categorie === 'conforme') && (
                  <>
                    <a href={`/dashboard?adresse=${encodeURIComponent(adresseVerdict)}`} className="block rounded-xl bg-ct-encre px-5 py-3.5 text-center font-semibold text-white transition hover:bg-black">
                      {verdict.rapport_recommande ? T.poursuivre : T.poursuivreNorme}
                    </a>
                    {verdict.rapport_recommande && <p className="text-sm text-ct-gris">{T.poursuivreNote}</p>}
                  </>
                )}
              </div>
            )}

            {(verdict.categorie === 'hors_champ' ||
              (verdict.categorie === 'adresse_partagee' && !verdict.appartement_requis) ||
              (verdict.categorie === 'appartement_inconnu' && verdict.pistes.length === 0) ||
              verdict.categorie === 'batiment_modifie' || verdict.categorie === 'indeterminable' ||
              verdict.categorie === 'ville_non_couverte') && (
              <p><a href="/contact" className="underline">{T.joindre}</a></p>
            )}
          </section>

          {peutExpliquer && (
            <aside className={`rounded-2xl border border-ct-ligne bg-ct-fond p-5 transition-opacity lg:col-span-4 ${panneau ? 'opacity-100' : 'hidden lg:block lg:opacity-70'}`} aria-live="polite">
              {panneau === 'comparables' && g && <PanneauComparables g={g} langue={langue} />}
              {panneau === 'sigma' && c && c.ecart_sigma != null && (
                <PanneauSigma ecart={c.ecart_sigma} histo={g?.histogramme ?? null} superposer={superposer} setSuperposer={setSuperposer} langue={langue} />
              )}
              {!panneau && <p className="text-sm text-gray-500">{T.panneauVide}</p>}
            </aside>
          )}
        </div>
      )}
      </div>}
    </div>
  );
}
