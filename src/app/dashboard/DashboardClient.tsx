'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabaseClient';
import type { Verdict } from '@/lib/pretri/types';
import type { Dossier, Rapport } from '@/lib/espace/types';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { fmtDate, t } from '@/lib/i18n/textes';

// Tableau de bord du client : ses dossiers, ses rapports, et l'ouverture d'un
// nouveau dossier à partir d'une adresse (vérifiée par l'analyse préliminaire,
// dont l'instantané est gardé).

export default function DashboardClient() {
  return (
    <Suspense fallback={<main className="max-w-5xl">…</main>}>
      <Tableau />
    </Suspense>
  );
}

const TEINTE_STATUT: Record<string, string> = {
  nouveau: 'bg-gray-100 text-ct-encre',
  ventes_recues: 'bg-amber-50 text-amber-900',
  en_analyse: 'bg-amber-50 text-amber-900',
  rapport_disponible: 'bg-emerald-50 text-emerald-900',
  ferme: 'bg-gray-100 text-ct-gris',
};

function Tableau() {
  const supabase = getSupabase();
  const router = useRouter();
  const params = useSearchParams();
  const { langue } = useLangue();
  const T = t(langue).espace;
  const adresseParam = params.get('adresse') ?? '';

  const [session, setSession] = useState<Session | null>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  const [adresse, setAdresse] = useState(adresseParam);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verification, setVerification] = useState(false);
  const [creation, setCreation] = useState(false);
  const [ouvrir, setOuvrir] = useState(Boolean(adresseParam));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        const suite = '/dashboard' + (adresseParam ? `?adresse=${encodeURIComponent(adresseParam)}` : '');
        router.replace(`/auth?next=${encodeURIComponent(suite)}`);
        return;
      }
      setSession(data.session);
    });
  }, [supabase, router, adresseParam]);

  const charger = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('dossiers')
      .select('id, adresse, ville, statut, cree_le, maj_le, rapport_chemin')
      .order('cree_le', { ascending: false });
    if (error) setErreur(error.message); else setDossiers(data as Dossier[]);
    const { data: r } = await supabase
      .from('dossier_rapports')
      .select('id, dossier_id, langue, chemin, nom_fichier, annee, depose_le, dossiers(adresse)')
      .order('depose_le', { ascending: false });
    setRapports((r as unknown as Rapport[]) ?? []);
    const { data: p } = await supabase.from('profils').select('role, nom').eq('id', session.user.id).maybeSingle();
    setAdmin(p?.role === 'admin');
    setNom(p?.nom ?? null);
  }, [supabase, session]);

  useEffect(() => { charger(); }, [charger]);

  const verifier = useCallback(async (a: string) => {
    setVerification(true);
    setVerdict(null);
    setErreur(null);
    try {
      const rep = await fetch('/api/pretri', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adresse: a, langue }),
      });
      const corps = await rep.json();
      if (!rep.ok) setErreur(corps.erreur ?? '…');
      else setVerdict(corps as Verdict);
    } catch {
      setErreur('…');
    } finally {
      setVerification(false);
    }
  }, [langue]);

  useEffect(() => {
    if (session && adresseParam) verifier(adresseParam);
  }, [session, adresseParam, verifier]);

  async function creer() {
    if (!session || !verdict?.unite) return;
    setCreation(true);
    setErreur(null);
    const u = verdict.unite;
    const nomVille = verdict.couverture?.nom;
    const { data, error } = await supabase
      .from('dossiers')
      .insert({
        adresse: u.adresse + (nomVille ? `, ${nomVille}` : ''),
        ville: verdict.couverture?.ville ?? null,
        matricule: verdict.matricule,
        langue,
        unite: { categorie: verdict.categorie, titre: verdict.titre, unite: u, chiffres: verdict.chiffres, couverture: verdict.couverture },
      })
      .select('id')
      .single();
    setCreation(false);
    if (error) setErreur(error.message);
    else router.push(`/dashboard/dossier/${data.id}`);
  }

  async function telecharger(r: Rapport) {
    const { data, error } = await supabase.storage.from('rapports').createSignedUrl(r.chemin, 600, { download: r.nom_fichier });
    if (error || !data) { setErreur(error?.message ?? '…'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function deconnecter() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!session) return <main className="max-w-5xl">…</main>;

  return (
    <main className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{T.mesDossiers}</h1>
          <p className="mt-1 text-sm text-ct-gris">{nom ? `${T.bonjour} ${nom}` : `${T.connecte} ${session.user.email}`}</p>
        </div>
        <div className="flex gap-2 text-sm">
          {admin && <Link href="/admin" className="rounded-full border border-ct-ligne px-3 py-1.5 hover:border-ct-encre">{T.admin}</Link>}
          <button type="button" onClick={deconnecter} className="rounded-full border border-ct-ligne px-3 py-1.5 text-ct-gris hover:border-ct-encre hover:text-ct-encre">{T.deconnexion}</button>
        </div>
      </div>

      {erreur && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-ct-rouge-pale p-3 text-sm text-ct-rouge">{erreur}</p>}

      <section className="mt-6 grid gap-3">
        {dossiers === null && <p className="text-ct-gris">{T.lecture}</p>}
        {dossiers?.length === 0 && !ouvrir && <p className="rounded-2xl border border-ct-ligne bg-white p-6 text-ct-gris">{T.aucun}</p>}
        {dossiers?.map((d) => (
          <Link key={d.id} href={`/dashboard/dossier/${d.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ct-ligne bg-white p-5 shadow-sm transition hover:border-ct-vert">
            <div>
              <p className="font-semibold">{d.adresse}</p>
              <p className="text-sm text-ct-gris">{T.ouvertLe} {fmtDate(langue, d.cree_le)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${TEINTE_STATUT[d.statut] ?? ''}`}>{T.statuts[d.statut] ?? d.statut}</span>
          </Link>
        ))}
      </section>

      <section className="mt-8">
        {!ouvrir ? (
          <button type="button" onClick={() => setOuvrir(true)} className="rounded-xl bg-ct-vert px-5 py-3 font-semibold text-white transition hover:bg-ct-vert-fonce">{T.ouvrir}</button>
        ) : (
          <div className="rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{T.ouvrir}</h2>
            <p className="mt-1 text-sm text-ct-gris">{T.ouvrirNote}</p>
            <form onSubmit={(e) => { e.preventDefault(); if (adresse.trim()) verifier(adresse.trim()); }} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="1482 Rue Marie-Anne Est, Montréal" maxLength={120} required
                className="flex-1 rounded-xl border border-ct-ligne px-4 py-3 outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
              <button type="submit" disabled={verification} className="rounded-xl border border-ct-vert px-5 py-3 font-semibold text-ct-vert transition hover:bg-ct-vert-pale disabled:opacity-50">
                {verification ? T.recherche : T.verifierImmeuble}
              </button>
            </form>
            {verdict && (
              <div className="mt-5 rounded-xl border border-ct-ligne bg-gray-50 p-4">
                {verdict.unite ? (
                  <>
                    <p className="text-sm text-ct-gris">{T.immeubleTrouve}</p>
                    <p className="font-semibold">{verdict.unite.adresse}{verdict.couverture?.nom ? `, ${verdict.couverture.nom}` : ''}</p>
                    <p className="mt-2 text-sm">{T.analyse} <strong>{verdict.titre}</strong></p>
                    {verdict.categorie === 'adresse_partagee' || verdict.categorie === 'appartement_inconnu' ? (
                      <p className="mt-2 text-sm text-ct-rouge">{verdict.message}</p>
                    ) : (
                      <button type="button" onClick={creer} disabled={creation} className="mt-4 rounded-xl bg-ct-vert px-5 py-3 font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50">
                        {creation ? T.creation : T.creer}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold">{verdict.titre}</p>
                    <p className="mt-1 text-sm">{verdict.message}</p>
                    {verdict.pistes.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {verdict.pistes.map((p) => (
                          <li key={p}><button type="button" onClick={() => { setAdresse(p); verifier(p); }} className="rounded-full border border-ct-ligne bg-white px-3 py-1 text-sm hover:border-ct-vert">{p}</button></li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">{T.mesRapports}</h2>
        {rapports.length === 0 ? (
          <p className="mt-2 text-sm text-ct-gris">{T.aucunRapport}</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {rapports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ct-ligne bg-white p-4 shadow-sm">
                <div>
                  <p className="font-medium">{r.dossiers?.adresse}</p>
                  <p className="text-sm text-ct-gris">
                    <span className="mr-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase">{r.langue === 'fr' ? T.langueFr : T.langueEn}</span>
                    {T.deposeLe} {fmtDate(langue, r.depose_le)} · {r.nom_fichier}
                  </p>
                </div>
                <button type="button" onClick={() => telecharger(r)} className="rounded-xl border border-ct-vert px-4 py-2 font-semibold text-ct-vert transition hover:bg-ct-vert-pale">{T.telecharger}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
