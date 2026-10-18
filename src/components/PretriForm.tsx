'use client';
import { FormEvent, ReactNode, useState } from 'react';
import type { GroupeSql, Verdict } from '@/lib/pretri/types';
import CourbeSigma, { COMPS, legendeSigma, formaterUneSur, partObservee, uneSur } from '@/components/CourbeSigma';
import CourbeHistorique from '@/components/CourbeHistorique';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { fmtNombre, t } from '@/lib/i18n/textes';
import type { Langue } from '@/lib/i18n/langue';
import { motsClesVerdict } from '@/lib/pretri/verdict';
import { decrireComparables } from '@/lib/pretri/comparables';

const TEINTE: Record<string, string> = {
  avantageux: 'border-emerald-200 bg-emerald-50',
  conforme: 'border-emerald-200 bg-emerald-50',
  defendable: 'border-amber-300 bg-amber-50',
  solide: 'border-orange-300 bg-orange-50',
  hors_proportions: 'border-red-300 bg-red-50',
};

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
      <h3 className="font-semibold">{T.compTitre}</h3>
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
      <h3 className="font-semibold">{T.lireEcart}</h3>
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

export default function PretriForm() {
  const { langue } = useLangue();
  const T = t(langue).formulaire;
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
      const rep = await fetch('/api/analyse-preliminaire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adresse: adresseVerdict, langue }),
      });
      if (!rep.ok) {
        const corps = await rep.json().catch(() => ({}));
        setErreur(corps.erreur ?? T.erreur);
        return;
      }
      const blob = await rep.blob();
      const nom = decodeURIComponent(rep.headers.get('X-Nom-Fichier') ?? 'analyse-preliminaire.pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nom; a.click();
      URL.revokeObjectURL(url);
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

  return (
    <div>
      <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-ct-ligne bg-white p-3 shadow-lg shadow-black/5 sm:flex-row">
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
          className="flex-1 rounded-xl border border-ct-ligne px-4 py-3 text-lg outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20"
        />
        <button
          type="submit"
          disabled={chargement}
          className="rounded-xl bg-ct-vert px-6 py-3 text-lg font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50"
        >
          {chargement ? T.recherche : T.verifier}
        </button>
      </form>
      <p className="mt-3 text-sm text-ct-gris">{T.aide}</p>

      {erreur && (
        <div role="alert" className="mt-6 max-w-2xl rounded-xl border border-red-200 bg-ct-rouge-pale p-4 text-ct-rouge">{erreur}</div>
      )}

      {verdict && (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,42rem)_minmax(18rem,1fr)]">
          <section aria-live="polite" className={`rounded-2xl border p-6 shadow-sm ${TEINTE[verdict.categorie] ?? 'border-ct-ligne bg-white'}`}>
            {u && (
              <p className="mb-3 text-sm text-gray-600">
                {T.trouve} <strong>{u.adresse}</strong>
                {u.logements != null && ` · ${u.logements} ${u.logements > 1 ? T.logements : T.logement}`}
                {u.annee_construction != null && ` · ${T.construit} ${u.annee_construction}`}
                {u.categorie && u.categorie !== 'Régulier' && ` · ${u.categorie}`}
              </p>
            )}
            {verdict.couverture?.apercu && verdict.couverture.note && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950" role="note">
                {verdict.couverture.note}
              </div>
            )}
            <h2 className="text-2xl font-semibold">{verdict.titre}</h2>
            {peutExpliquer
              ? <MessageAvecDeclencheurs texte={verdict.message} ouvrir={ouvrir} actif={panneau} mots={mots} />
              : <p className="mt-3 leading-relaxed">{verdict.message}</p>}

            {verdict.pistes.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {verdict.pistes.map((p, i) => (
                  <li key={`${i}-${p}`}>
                    <button type="button" onClick={() => suivrePiste(p)} className="rounded-full border border-ct-ligne bg-white px-3 py-1 text-sm transition hover:border-ct-vert hover:bg-ct-vert-pale">
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {verdict.appartement_requis && (
              <form onSubmit={(e) => { e.preventDefault(); if (appartement.trim()) chercherUnite(appartement); }} className="mt-4 flex flex-wrap items-end gap-3">
                <label className="text-sm text-gray-700">
                  {T.appartement}
                  <input name="appartement" value={appartement} onChange={(e) => setAppartement(e.target.value)} placeholder="316" maxLength={8} required
                    className="mt-1 block w-32 rounded-lg border border-ct-ligne px-3 py-2 text-base outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
                </label>
                <button type="submit" disabled={chargement} className="rounded-lg bg-ct-vert px-4 py-2 font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50">
                  {T.verifierUnite}
                </button>
              </form>
            )}

            {c && c.ecart_sigma != null && (
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div><dt className="text-gray-500">{T.rolePrec}</dt><dd className="font-medium">{langue === 'fr' ? `${nombre(c.valeur_precedente)} $` : `$${nombre(c.valeur_precedente)}`}</dd></div>
                <div><dt className="text-gray-500">{T.role} {c.role_libelle}</dt><dd className="font-medium">{langue === 'fr' ? `${nombre(c.valeur_proposee)} $` : `$${nombre(c.valeur_proposee)}`}</dd></div>
                <div><dt className="text-gray-500">{T.hausse}</dt><dd className="font-medium">{pct(c.hausse_pct)}</dd></div>
                <div><dt className="text-gray-500">{T.mediane}</dt><dd className="font-medium">{c.secteur_mediane_pct != null ? pct(c.secteur_mediane_pct) : '—'}</dd></div>
                <div>
                  <dt className="text-gray-500"><Declencheur sujet="comparables" ouvrir={ouvrir} actif={panneau === 'comparables'}>{T.comparables}</Declencheur></dt>
                  <dd className="font-medium">{c.n_comparables ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500"><Declencheur sujet="sigma" ouvrir={ouvrir} actif={panneau === 'sigma'}>{T.ecart}</Declencheur></dt>
                  <dd className="font-medium">{sig(c.ecart_sigma)}</dd>
                </div>
              </dl>
            )}

            {verdict.enjeu && verdict.taux && (
              <div className="mt-5 border-t border-black/10 pt-4">
                <p className="text-sm text-gray-800">
                  {verdict.enjeu}
                  <sup className="ml-px text-[0.7em] leading-none"><a href="#note-taux" className="text-ct-vert hover:underline">1</a></sup>
                </p>
                {verdict.frais_texte && verdict.frais && (
                  <p className="mt-2 text-sm text-gray-800">
                    {verdict.frais_texte}
                    <sup className="ml-px text-[0.7em] leading-none"><a href="#note-frais" className="text-ct-vert hover:underline">2</a></sup>
                  </p>
                )}
                <p id="note-taux" className="mt-2 text-xs leading-relaxed text-gray-500">
                  1. {T.noteTaux}{' '}
                  <a href={verdict.taux.source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre">{verdict.taux.source_libelle}</a>
                  . {verdict.taux.niveau === 'arrondissement' ? T.deArr : T.deMun} {T.noteTauxSuite}
                </p>
                {verdict.frais_texte && verdict.frais && (
                  <p id="note-frais" className="mt-1 text-xs leading-relaxed text-gray-500">
                    2. {T.noteFrais}{' '}
                    <a href={verdict.frais.source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-ct-ligne underline-offset-2 hover:text-ct-encre">{verdict.frais.source_libelle}</a>
                    . {T.noteFraisSuite}
                  </p>
                )}
              </div>
            )}

            {verdict.reserve && <p className="mt-5 border-t border-black/10 pt-4 text-sm text-gray-700">{verdict.reserve}</p>}

            {verdict.historique.length >= 1 && (
              <div className="mt-5 border-t border-black/10 pt-4">
                <h3 className="font-semibold">{T.histoTitre}</h3>
                <div className="mt-2 rounded-xl border border-ct-ligne bg-white p-2">
                  <CourbeHistorique historique={verdict.historique} langue={langue} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ct-gris">{T.histoNote}</p>
              </div>
            )}

            {c && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
                <button type="button" onClick={telechargerPdf} disabled={pdfEnCours}
                  className="rounded-xl border border-ct-vert px-4 py-2 font-semibold text-ct-vert transition hover:bg-ct-vert-pale disabled:opacity-50">
                  {pdfEnCours ? T.pdfEnCours : T.pdf}
                </button>
                <span className="text-xs text-ct-gris">{T.pdfNote}</span>
              </div>
            )}

            {verdict.rapport_recommande && (
              <div className="mt-6">
                <a href={`/dashboard?adresse=${encodeURIComponent(adresseVerdict)}`} className="inline-block rounded-xl bg-ct-vert px-5 py-3 font-semibold text-white transition hover:bg-ct-vert-fonce">
                  {T.poursuivre}
                </a>
                <p className="mt-2 text-sm text-gray-600">{T.poursuivreNote}</p>
              </div>
            )}

            {(verdict.categorie === 'hors_champ' ||
              (verdict.categorie === 'adresse_partagee' && !verdict.appartement_requis) ||
              (verdict.categorie === 'appartement_inconnu' && verdict.pistes.length === 0) ||
              verdict.categorie === 'batiment_modifie' || verdict.categorie === 'indeterminable' ||
              verdict.categorie === 'ville_non_couverte') && (
              <p className="mt-5"><a href="/contact" className="underline">{T.joindre}</a></p>
            )}
          </section>

          {peutExpliquer && (
            <aside className={`rounded-2xl border border-ct-ligne bg-white p-5 shadow-sm transition-opacity ${panneau ? 'opacity-100' : 'hidden lg:block lg:opacity-60'}`} aria-live="polite">
              {panneau === 'comparables' && g && <PanneauComparables g={g} langue={langue} />}
              {panneau === 'sigma' && c && c.ecart_sigma != null && (
                <PanneauSigma ecart={c.ecart_sigma} histo={g?.histogramme ?? null} superposer={superposer} setSuperposer={setSuperposer} langue={langue} />
              )}
              {!panneau && <p className="text-sm text-gray-500">{T.panneauVide}</p>}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
