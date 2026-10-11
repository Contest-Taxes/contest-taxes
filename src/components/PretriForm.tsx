'use client';
import { FormEvent, ReactNode, useState } from 'react';
import type { GroupeSql, Verdict } from '@/lib/pretri/types';
import CourbeSigma, { COMPS, LEGENDE_SIGMA, formaterUneSur, partObservee, uneSur } from '@/components/CourbeSigma';

const TEINTE: Record<string, string> = {
  avantageux: 'border-emerald-200 bg-emerald-50',
  conforme: 'border-emerald-200 bg-emerald-50',
  defendable: 'border-amber-300 bg-amber-50',
  solide: 'border-orange-300 bg-orange-50',
  hors_proportions: 'border-red-300 bg-red-50',
};

const nombre = (v: number, d = 0) =>
  v.toLocaleString('fr-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => (v >= 0 ? '+' : '−') + nombre(Math.abs(v), 1) + ' %';
const sig = (v: number) => (v >= 0 ? '+' : '−') + nombre(Math.abs(v), 1) + ' σ';

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

// Le message du verdict est une chaîne identique à celle du moteur Python ;
// on y insère les déclencheurs sans en changer un mot.
function MessageAvecDeclencheurs({ texte, ouvrir, actif }: {
  texte: string; ouvrir: (s: Sujet, epingler?: boolean) => void; actif: Sujet | null;
}) {
  const morceaux = texte.split(/(bâtiments comparables|écarts-types)/);
  return (
    <p className="mt-3 leading-relaxed">
      {morceaux.map((m, i) => {
        if (m === 'bâtiments comparables') {
          return <Declencheur key={i} sujet="comparables" ouvrir={ouvrir} actif={actif === 'comparables'}>{m}</Declencheur>;
        }
        if (m === 'écarts-types') {
          return <Declencheur key={i} sujet="sigma" ouvrir={ouvrir} actif={actif === 'sigma'}>{m}</Declencheur>;
        }
        return <span key={i}>{m}</span>;
      })}
    </p>
  );
}

function plage(p: [number | null, number | null] | undefined, unite = '', brut = false): string | null {
  if (!p || p[0] == null || p[1] == null) return null;
  const f = (v: number) => (brut ? String(v) : nombre(v));   // années : sans séparateur de milliers
  return p[0] === p[1] ? `${f(p[0])}${unite}` : `de ${f(p[0])} à ${f(p[1])}${unite}`;
}

function PanneauComparables({ g }: { g: GroupeSql }) {
  const parDistance = g.rayon_m != null;
  const fin = g.niveau === 'cellule et logements';
  const etages = plage(g.etages);
  const annees = plage(g.annees, '', true);
  const aire = plage(g.aire_m2, ' m²');
  const rayon = g.rayon_m != null ? (g.rayon_m >= 1000 ? `${g.rayon_m / 1000} km` : `${g.rayon_m} m`) : null;
  const logMin = g.logements != null ? Math.max(1, g.logements - 1) : null;
  const logMax = g.logements != null ? Math.min(5, g.logements + 1) : null;
  return (
    <div>
      <h3 className="font-semibold">Vos bâtiments comparables</h3>
      {parDistance ? (
        <p className="mt-2 text-sm leading-relaxed">
          Les <strong>{nombre(g.n)} bâtiments</strong> résidentiels situés à moins de <strong>{rayon}</strong> du vôtre,
          {logMin != null && logMax != null && (
            <> de <strong>{logMin === logMax ? `${logMin}` : `${logMin} à ${logMax}`} logement{(logMax ?? 0) > 1 ? 's' : ''}</strong>
              {g.logements != null && ` (le vôtre : ${g.logements})`},</>
          )}
          {g.aire_sujet_m2 != null && (
            <> d’aire d’étages à <strong>±20 %</strong> de la vôtre ({nombre(g.aire_sujet_m2)} m²)</>
          )}
          {g.rues.length > 0 ? <>, autour de : {g.rues.join(', ')}</> : null}.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed">
          Les <strong>{nombre(g.n)} immeubles</strong>{' '}
          {fin ? <>de <strong>{g.logements} logement{(g.logements ?? 0) > 1 ? 's' : ''}</strong> </> : <>résidentiels de 1 à 5 logements </>}
          de votre cellule cadastrale, un carré d’environ 1 km de côté.
        </p>
      )}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {aire && <><dt className="text-gray-500">Aire d’étages</dt><dd>{aire}</dd></>}
        {etages && <><dt className="text-gray-500">Étages</dt><dd>{etages}</dd></>}
        {annees && <><dt className="text-gray-500">Construction</dt><dd>{annees}</dd></>}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-gray-600">
        {parDistance
          ? (g.rayon_m != null && g.rayon_m > 500
              ? `Trop peu de bâtiments comparables à moins de 500 m : le rayon a été élargi à ${rayon}.`
              : 'Même voisinage, même taille, même nombre de logements à un près : la comparaison la plus fine que permettent les données publiques.')
          : (fin
              ? 'Même cellule, même nombre de logements : la comparaison la plus fine que permettent les données publiques.'
              : 'Trop peu d’immeubles de même taille dans la cellule : la comparaison porte sur toute la cellule.')}{' '}
        Les bâtiments agrandis entre les deux rôles en sont exclus. Aucun ajustement pour
        l’âge ou l’état : c’est un tri, pas une évaluation.
      </p>
    </div>
  );
}

function PanneauSigma({ ecart, histo, superposer, setSuperposer }: {
  ecart: number;
  histo: GroupeSql['histogramme'] | null;
  superposer: boolean;
  setSuperposer: (v: boolean) => void;
}) {
  const h = superposer ? histo : null;
  return (
    <div>
      <h3 className="font-semibold">Lire un écart-type</h3>
      <p className="mt-2 text-sm leading-relaxed">
        Deux immeubles voisins ne reçoivent jamais exactement la même hausse. La question
        n’est pas « êtes-vous au-dessus de la médiane », mais « de combien, comparé à
        l’écart habituel entre vos comparables ». C’est ce que mesure l’écart-type, noté σ.
      </p>
      <div className="mt-3 rounded-lg border bg-white p-2">
        <CourbeSigma ecart={ecart} histo={h} />
      </div>
      {histo && (
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={superposer} onChange={(e) => setSuperposer(e.target.checked)} className="mt-0.5" />
          <span>
            Superposer la distribution réelle de vos comparables{' '}
            <span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: COMPS, opacity: 0.7 }} />{' '}
            <span className="text-gray-500">(expérimental)</span>
          </span>
        </label>
      )}
      {ecart > 0 ? (
        <p className="mt-3 text-sm leading-relaxed">
          À <strong>{(ecart >= 0 ? '+' : '−') + nombre(Math.abs(ecart), 1)} σ</strong>, {formaterUneSur(uneSur(ecart))} se situe
          aussi loin au-dessus de la médiane, si les hausses suivaient une loi normale.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed">
          Votre immeuble est <strong>sous la médiane</strong> de son secteur : la question d’une
          hausse « élevée » ne se pose pas.
        </p>
      )}
      <ul className="mt-3 space-y-1.5 text-xs leading-snug">
        {LEGENDE_SIGMA.map((l) => {
          const ici = l.test(ecart);
          const obs = h ? partObservee(h, l.seuil) : null;
          return (
            <li key={l.bande} className={`flex gap-2 ${ici ? 'rounded-md bg-black/5 p-1.5 font-semibold' : 'text-gray-600'}`}>
              <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border" style={{ backgroundColor: l.couleur }} />
              <span>
                <strong>{l.bande}</strong> — {l.frequence} : {l.lecture}{ici ? ' ← vous' : ''}
                {obs && (
                  <span className="ml-1 font-normal" style={{ color: COMPS }}>
                    {' '}· observé dans votre secteur : {obs.n} sur {obs.total}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        Fréquences d’une loi normale, lues vers le haut. Les bandes bleues valent 1, 2 et 3 écarts-types de part et d’autre de la médiane.
      </p>
    </div>
  );
}

export default function PretriForm() {
  const [adresse, setAdresse] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [panneau, setPanneau] = useState<Sujet | null>(null);
  const [epingle, setEpingle] = useState(false);
  const [superposer, setSuperposer] = useState(false);

  function ouvrir(s: Sujet, epingler = false) {
    if (epingler) {
      if (panneau === s && epingle) { setPanneau(null); setEpingle(false); return; }
      setEpingle(true);
    } else if (epingle) {
      return; // un panneau épinglé ne change pas au simple survol
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
        body: JSON.stringify({ adresse: a }),
      });
      const corps = await rep.json();
      if (!rep.ok) setErreur(corps.erreur ?? 'Une erreur est survenue.');
      else setVerdict(corps as Verdict);
    } catch {
      setErreur('Impossible de joindre le service. Vérifiez votre connexion et réessayez.');
    } finally {
      setChargement(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (adresse.trim()) chercher(adresse);
  }

  // Une piste cliquée (voie approchante, numéro voisin) remplace la saisie.
  function suivrePiste(piste: string) {
    const m = adresse.trim().match(/^(\d+(?:\s*[-–]\s*\d+)?)\s+/);
    const nouvelle = /^\d/.test(piste) ? piste : `${m ? m[1] : ''} ${piste}`.trim();
    setAdresse(nouvelle);
    chercher(nouvelle);
  }

  const c = verdict?.chiffres ?? null;
  const u = verdict?.unite ?? null;
  const g = verdict?.groupe ?? null;
  const peutExpliquer = Boolean(c && c.ecart_sigma != null);

  return (
    <div>
      <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-ct-ligne bg-white p-3 shadow-lg shadow-black/5 sm:flex-row">
        <label className="sr-only" htmlFor="adresse">Adresse de l’immeuble</label>
        <input
          id="adresse"
          name="adresse"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="Ex. : 1482 Rue Marie-Anne Est"
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
          {chargement ? 'Recherche…' : 'Vérifier'}
        </button>
      </form>
      <p className="mt-3 text-sm text-ct-gris">Gratuit, sans compte. Aucune adresse n’est conservée.</p>

      {erreur && (
        <div role="alert" className="mt-6 max-w-2xl rounded-xl border border-red-200 bg-ct-rouge-pale p-4 text-ct-rouge">
          {erreur}
        </div>
      )}

      {verdict && (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,42rem)_minmax(18rem,1fr)]">
          <section
            aria-live="polite"
            className={`rounded-2xl border p-6 shadow-sm ${TEINTE[verdict.categorie] ?? 'border-ct-ligne bg-white'}`}
          >
            {u && (
              <p className="mb-3 text-sm text-gray-600">
                Immeuble trouvé : <strong>{u.adresse}</strong>
                {u.logements != null && ` · ${u.logements} logement${u.logements > 1 ? 's' : ''}`}
                {u.annee_construction != null && ` · construit en ${u.annee_construction}`}
                {u.categorie && u.categorie !== 'Régulier' && ` · ${u.categorie}`}
              </p>
            )}
            <h2 className="text-2xl font-semibold">{verdict.titre}</h2>
            {peutExpliquer
              ? <MessageAvecDeclencheurs texte={verdict.message} ouvrir={ouvrir} actif={panneau} />
              : <p className="mt-3 leading-relaxed">{verdict.message}</p>}

            {verdict.pistes.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {verdict.pistes.map((p, i) => (
                  <li key={`${i}-${p}`}>
                    <button
                      type="button"
                      onClick={() => suivrePiste(p)}
                      className="rounded-full border border-ct-ligne bg-white px-3 py-1 text-sm transition hover:border-ct-vert hover:bg-ct-vert-pale"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {c && c.ecart_sigma != null && (
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div><dt className="text-gray-500">Rôle précédent</dt><dd className="font-medium">{nombre(c.valeur_precedente)} $</dd></div>
                <div><dt className="text-gray-500">Rôle {c.role_libelle}</dt><dd className="font-medium">{nombre(c.valeur_proposee)} $</dd></div>
                <div><dt className="text-gray-500">Votre hausse</dt><dd className="font-medium">{pct(c.hausse_pct)}</dd></div>
                <div><dt className="text-gray-500">Médiane du secteur</dt><dd className="font-medium">{c.secteur_mediane_pct != null ? pct(c.secteur_mediane_pct) : '—'}</dd></div>
                <div>
                  <dt className="text-gray-500">
                    <Declencheur sujet="comparables" ouvrir={ouvrir} actif={panneau === 'comparables'}>Bâtiments comparables</Declencheur>
                  </dt>
                  <dd className="font-medium">{c.n_comparables ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">
                    <Declencheur sujet="sigma" ouvrir={ouvrir} actif={panneau === 'sigma'}>Écart</Declencheur>
                  </dt>
                  <dd className="font-medium">{sig(c.ecart_sigma)}</dd>
                </div>
              </dl>
            )}

            {verdict.reserve && (
              <p className="mt-5 border-t border-black/10 pt-4 text-sm text-gray-700">{verdict.reserve}</p>
            )}

            {verdict.rapport_recommande && (
              <div className="mt-6">
                <a href="/contact" className="inline-block rounded-xl bg-ct-vert px-5 py-3 font-semibold text-white transition hover:bg-ct-vert-fonce">
                  Poursuivre : nous écrire pour le rapport complet →
                </a>
                <p className="mt-2 text-sm text-gray-600">
                  Le rapport compare votre évaluation aux ventes réelles de votre secteur, celles que la Ville vous affiche. Parcours en ligne et prise de contact à venir.
                </p>
              </div>
            )}

            {(verdict.categorie === 'hors_champ' || verdict.categorie === 'adresse_partagee' ||
              verdict.categorie === 'batiment_modifie' || verdict.categorie === 'indeterminable') && (
              <p className="mt-5"><a href="/contact" className="underline">Nous joindre →</a></p>
            )}
          </section>

          {peutExpliquer && (
            <aside
              className={`rounded-2xl border border-ct-ligne bg-white p-5 shadow-sm transition-opacity ${panneau ? 'opacity-100' : 'hidden lg:block lg:opacity-60'}`}
              aria-live="polite"
            >
              {panneau === 'comparables' && g && <PanneauComparables g={g} />}
              {panneau === 'sigma' && c && c.ecart_sigma != null && (
                <PanneauSigma ecart={c.ecart_sigma} histo={g?.histogramme ?? null} superposer={superposer} setSuperposer={setSuperposer} />
              )}
              {!panneau && (
                <p className="text-sm text-gray-500">
                  Survolez <span className="underline decoration-dotted decoration-2 underline-offset-4">bâtiments comparables</span> ou{' '}
                  <span className="underline decoration-dotted decoration-2 underline-offset-4">écarts-types</span> dans le verdict pour voir
                  ce qui est comparé, et comment lire l’écart.
                </p>
              )}
              {panneau && (
                <button
                  type="button"
                  onClick={() => { setPanneau(null); setEpingle(false); }}
                  className="mt-4 text-xs text-gray-500 underline"
                >
                  Fermer
                </button>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
