'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabaseClient';
import type { Verdict } from '@/lib/pretri/types';
import { STYLE_STATUT, type Dossier } from '@/lib/espace/types';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { fmtDate, t } from '@/lib/i18n/textes';
import Bandeau from '@/components/espace/Bandeau';
import AvisRoleClos from '@/components/espace/AvisRoleClos';

// Tableau de bord du client (planche « Espace client : mes dossiers ») :
// bandeau d'encre, puis en haut l'ouverture d'un dossier à partir d'une
// adresse vérifiée par l'analyse préliminaire (avec l'avertissement quand le
// délai de révision du rôle est passé), puis les dossiers en cartes à liseré
// par statut. Les rapports se téléchargent depuis la page de chaque dossier.

interface DossierListe extends Dossier {
  dossier_ventes: { count: number }[];
  dossier_rapports: { langue: 'fr' | 'en' }[];
}

export default function DashboardClient() {
  return (
    <Suspense fallback={<div className="conteneur">…</div>}>
      <Tableau />
    </Suspense>
  );
}

function Tableau() {
  const supabase = getSupabase();
  const router = useRouter();
  const params = useSearchParams();
  const { langue } = useLangue();
  const T = t(langue).espace;
  const TF = t(langue).formulaire;
  const adresseParam = params.get('adresse') ?? '';

  const [session, setSession] = useState<Session | null>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [dossiers, setDossiers] = useState<DossierListe[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [adresse, setAdresse] = useState(adresseParam);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verification, setVerification] = useState(false);
  const [creation, setCreation] = useState(false);

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
      .select('id, adresse, ville, statut, cree_le, maj_le, rapport_chemin, dossier_ventes(count), dossier_rapports(langue)')
      .order('cree_le', { ascending: false });
    if (error) setErreur(error.message); else setDossiers(data as unknown as DossierListe[]);
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
      if (!rep.ok) setErreur(corps.erreur ?? TF.erreur);
      else setVerdict(corps as Verdict);
    } catch {
      setErreur(TF.erreurReseau);
    } finally {
      setVerification(false);
    }
  }, [langue, TF.erreur, TF.erreurReseau]);

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

  async function deconnecter() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!session) return <div className="conteneur">…</div>;

  // Rôle de l'immeuble vérifié : son délai de révision peut être passé.
  const roleVerifie = verdict?.unite ? (verdict.couverture?.role_libelle ?? verdict.chiffres?.role_libelle ?? null) : null;

  const langues = (ls: { langue: 'fr' | 'en' }[]) =>
    Array.from(new Set(ls.map((l) => l.langue))).map((l) => (l === 'fr' ? T.enFrancais : T.enAnglais)).join(` ${T.et} `);

  return (
    <>
      <Bandeau
        surtitre={T.surtitre}
        titre={T.mesDossiers}
        sousTitre={nom ? `${T.bonjour} ${nom}` : `${T.connecte} ${session.user.email}`}
        actions={
          <>
            <a href="#nouveau" className="rounded-xl bg-ct-vert px-4.5 py-2.5 font-semibold text-white transition hover:bg-ct-vert-fonce">{T.ouvrir}</a>
            {admin && <Link href="/admin" className="rounded-xl border border-white/35 px-4 py-2.5 text-white transition hover:bg-white/10">{T.admin}</Link>}
            <button type="button" onClick={deconnecter} className="rounded-xl border border-white/35 px-4 py-2.5 text-white transition hover:bg-white/10">{T.deconnexion}</button>
          </>
        }
      />

      <div className="conteneur flex flex-col gap-10">
        {erreur && <p role="alert" className="rounded-xl border border-red-200 bg-ct-rouge-pale p-3 text-sm text-ct-rouge">{erreur}</p>}

        <section id="nouveau" aria-labelledby="titre-nouveau" className="flex flex-col gap-2.5 rounded-2xl bg-ct-fond px-5 py-7 sm:px-8">
          <h2 id="titre-nouveau" className="font-display text-[26px] font-medium">{T.ouvrir}</h2>
          <p className="text-sm text-ct-gris">{T.ouvrirNote}</p>
          <form onSubmit={(e) => { e.preventDefault(); if (adresse.trim()) verifier(adresse.trim()); }} className="mt-1.5 flex flex-col gap-2.5 sm:flex-row">
            <label className="sr-only" htmlFor="adresse-dossier">{TF.label}</label>
            <input id="adresse-dossier" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder={TF.placeholder} maxLength={120} required
              className="min-w-0 flex-1 rounded-xl border border-ct-ligne bg-white px-4 py-3 outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
            <button type="submit" disabled={verification} className="rounded-xl border border-ct-vert px-5 py-3 font-semibold text-ct-vert-fonce transition hover:bg-ct-vert-pale disabled:opacity-50">
              {verification ? T.recherche : T.verifierImmeuble}
            </button>
          </form>
          {verdict && (
            <div className="mt-3 rounded-xl border border-ct-ligne bg-white p-4 sm:p-5">
              {verdict.unite ? (
                <>
                  <p className="text-sm text-ct-gris">{T.immeubleTrouve}</p>
                  <p className="font-display text-xl font-medium">{verdict.unite.adresse}{verdict.couverture?.nom ? `, ${verdict.couverture.nom}` : ''}</p>
                  <p className="mt-2 text-sm">{T.analyse} <strong>{verdict.titre}</strong></p>
                  {verdict.categorie === 'adresse_partagee' || verdict.categorie === 'appartement_inconnu' ? (
                    <p className="mt-2 text-sm text-ct-rouge">{verdict.message}</p>
                  ) : (
                    <>
                    <AvisRoleClos roleLibelle={roleVerifie} ville={verdict.couverture?.nom} niveau={3} className="mt-4" />
                    <button type="button" onClick={creer} disabled={creation} className="mt-4 rounded-xl bg-ct-encre px-5 py-3 font-semibold text-white transition hover:bg-black disabled:opacity-50">
                      {creation ? T.creation : T.creer}
                    </button>
                    </>
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
        </section>

        <section aria-label={T.mesDossiers} className="flex flex-col gap-3">
          {dossiers === null && <p className="text-ct-gris">{T.lecture}</p>}
          {dossiers?.length === 0 && <p className="rounded-2xl border border-ct-ligne bg-white p-6 text-ct-gris">{T.aucun}</p>}
          {dossiers?.map((d) => {
            const st = STYLE_STATUT[d.statut] ?? STYLE_STATUT.nouveau;
            const nVentes = d.dossier_ventes?.[0]?.count ?? 0;
            return (
              <Link key={d.id} href={`/dashboard/dossier/${d.id}`}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ct-ligne border-l-[6px] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(30,34,35,0.05)] transition hover:border-ct-vert ${st.lisere}`}>
                <div className="min-w-0">
                  <p className="font-display text-[22px] font-medium">{d.adresse}</p>
                  <p className="mt-1 text-sm text-ct-gris">
                    {T.ouvertLe} {fmtDate(langue, d.cree_le)} · {nVentes} {nVentes > 1 ? T.ventes : T.vente} {T.ventesFournies}
                    {d.dossier_rapports?.length > 0 && ` · ${T.rapportDeposeEn} ${langues(d.dossier_rapports)}`}
                  </p>
                </div>
                <span className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${st.pastille}`}>{T.statuts[d.statut] ?? d.statut}</span>
              </Link>
            );
          })}
        </section>
      </div>
    </>
  );
}
