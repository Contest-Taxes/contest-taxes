'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabaseClient';
import type { Dossier, Rapport, Vente } from '@/lib/espace/types';
import { analyserVentes, type VenteSaisie } from '@/lib/espace/ventes';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { fmtDate, fmtDollars, fmtPct, t } from '@/lib/i18n/textes';
import { telechargerAnalysePdf } from '@/lib/pretri/pdfClient';

// Un dossier : l'immeuble, où en est l'analyse, les rapports déposés (une
// langue par fichier), les ventes fournies, les notes du client.

export default function DossierClient({ id }: { id: string }) {
  const supabase = getSupabase();
  const router = useRouter();
  const { langue } = useLangue();
  const T = t(langue).espace;
  const [dossier, setDossier] = useState<Dossier | null | undefined>(undefined);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const [apercu, setApercu] = useState<VenteSaisie[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesEnregistrees, setNotesEnregistrees] = useState(false);
  const [pdfEnCours, setPdfEnCours] = useState(false);

  const charger = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { router.replace(`/auth?next=${encodeURIComponent(`/dashboard/dossier/${id}`)}`); return; }
    const { data, error } = await supabase.from('dossiers').select('*').eq('id', id).maybeSingle();
    if (error) { setErreur(error.message); setDossier(null); return; }
    setDossier((data as Dossier) ?? null);
    setNotes((data as Dossier | null)?.notes_client ?? '');
    const { data: r } = await supabase.from('dossier_rapports').select('*').eq('dossier_id', id).order('langue');
    setRapports((r as Rapport[]) ?? []);
    const { data: v } = await supabase.from('dossier_ventes').select('*').eq('dossier_id', id).order('date_vente', { ascending: false });
    setVentes((v as Vente[]) ?? []);
  }, [supabase, router, id]);

  useEffect(() => { charger(); }, [charger]);

  function preparer() { setApercu(analyserVentes(texte)); }

  async function ajouter() {
    if (!apercu) return;
    const bonnes = apercu.filter((v) => !v.probleme);
    if (bonnes.length === 0) return;
    setAjout(true);
    const { error } = await supabase.from('dossier_ventes').insert(bonnes.map((v) => ({ dossier_id: id, adresse: v.adresse, date_vente: v.date, prix: v.prix })));
    setAjout(false);
    if (error) setErreur(error.message); else { setTexte(''); setApercu(null); charger(); }
  }

  async function retirer(v: Vente) {
    const { error } = await supabase.from('dossier_ventes').delete().eq('id', v.id);
    if (error) setErreur(error.message); else charger();
  }

  async function enregistrerNotes() {
    const { error } = await supabase.from('dossiers').update({ notes_client: notes }).eq('id', id);
    if (error) setErreur(error.message);
    else { setNotesEnregistrees(true); setTimeout(() => setNotesEnregistrees(false), 2500); }
  }

  async function analysePdf() {
    if (!dossier) return;
    setPdfEnCours(true);
    setErreur(null);
    try {
      const e = await telechargerAnalysePdf(dossier.adresse, langue);
      if (e) setErreur(e);
    } finally {
      setPdfEnCours(false);
    }
  }

  async function telecharger(chemin: string, nomFichier: string) {
    const { data, error } = await supabase.storage.from('rapports').createSignedUrl(chemin, 600, { download: nomFichier });
    if (error || !data) { setErreur(error?.message ?? '…'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  if (dossier === undefined) return <main className="max-w-3xl">…</main>;
  if (dossier === null) {
    return <main className="max-w-3xl"><p>{T.inexistant}</p><p className="mt-3"><Link href="/dashboard" className="underline">{T.retour}</Link></p></main>;
  }
  const c = dossier.unite?.chiffres ?? null;
  const u = dossier.unite?.unite ?? null;
  const nBonnes = apercu ? apercu.filter((v) => !v.probleme).length : 0;

  return (
    <main className="max-w-3xl">
      <p className="text-sm"><Link href="/dashboard" className="underline">{T.retour}</Link></p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{dossier.adresse}</h1>
      <p className="mt-1 text-sm text-ct-gris">
        {u?.logements != null && `${u.logements} ${u.logements > 1 ? t(langue).formulaire.logements : t(langue).formulaire.logement}`}
        {u?.annee_construction != null && ` · ${t(langue).formulaire.construit} ${u.annee_construction}`}
        {u?.categorie && u.categorie !== 'Régulier' && ` · ${u.categorie}`}
        {` · ${T.ouvertLeDossier} ${fmtDate(langue, dossier.cree_le)}`}
      </p>

      {erreur && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-ct-rouge-pale p-3 text-sm text-ct-rouge">{erreur}</p>}

      <section className="mt-6 rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
        <p className="text-sm text-ct-gris">{T.ouEnEst}</p>
        <p className="text-xl font-semibold">{T.statuts[dossier.statut]}</p>
        <p className="mt-2 leading-relaxed">{T.etapes[dossier.statut]}</p>
        {rapports.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {rapports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ct-ligne p-3">
                <span className="text-sm">
                  <span className="mr-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase">{r.langue === 'fr' ? T.langueFr : T.langueEn}</span>
                  {r.nom_fichier} · {T.deposeLe} {fmtDate(langue, r.depose_le)}
                </span>
                <button type="button" onClick={() => telecharger(r.chemin, r.nom_fichier)} className="rounded-xl bg-ct-vert px-4 py-2 font-semibold text-white transition hover:bg-ct-vert-fonce">{T.telechargerPdf}</button>
              </li>
            ))}
          </ul>
        )}
        {rapports.length === 0 && dossier.statut === 'rapport_disponible' && dossier.rapport_chemin && (
          <button type="button" onClick={() => telecharger(dossier.rapport_chemin!, 'rapport.pdf')} className="mt-4 rounded-xl bg-ct-vert px-5 py-3 font-semibold text-white transition hover:bg-ct-vert-fonce">{T.telechargerPdf}</button>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ct-ligne pt-4">
          <button type="button" onClick={analysePdf} disabled={pdfEnCours} className="rounded-xl border border-ct-vert px-4 py-2 font-semibold text-ct-vert transition hover:bg-ct-vert-pale disabled:opacity-50">
            {pdfEnCours ? T.analysePdfEnCours : T.analysePdf}
          </button>
          <span className="text-xs text-ct-gris">{T.analysePdfNote}</span>
        </div>
      </section>

      {c && (
        <section className="mt-6 rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{T.disaitTitre}</h2>
          <p className="mt-1 text-sm text-ct-gris">{dossier.unite?.titre}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div><dt className="text-ct-gris">{T.rolePrec}</dt><dd className="font-medium">{fmtDollars(langue, c.valeur_precedente)}</dd></div>
            <div><dt className="text-ct-gris">{T.role} {c.role_libelle ?? ''}</dt><dd className="font-medium">{fmtDollars(langue, c.valeur_proposee)}</dd></div>
            <div><dt className="text-ct-gris">{T.hausse}</dt><dd className="font-medium">{fmtPct(langue, c.hausse_pct)}</dd></div>
            <div><dt className="text-ct-gris">{T.mediane}</dt><dd className="font-medium">{c.secteur_mediane_pct != null ? fmtPct(langue, c.secteur_mediane_pct) : '—'}</dd></div>
          </dl>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{T.ventesTitre}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ct-gris">{T.ventesNote}</p>
        {ventes.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-ct-gris"><th className="py-1 font-medium">{T.adresse}</th><th className="py-1 font-medium">{T.date}</th><th className="py-1 text-right font-medium">{T.prix}</th><th></th></tr></thead>
            <tbody>
              {ventes.map((v) => (
                <tr key={v.id} className="border-t border-ct-ligne">
                  <td className="py-1.5">{v.adresse}</td>
                  <td className="py-1.5">{v.date_vente ?? '—'}</td>
                  <td className="py-1.5 text-right">{v.prix != null ? fmtDollars(langue, Number(v.prix)) : '—'}</td>
                  <td className="py-1.5 text-right"><button type="button" onClick={() => retirer(v)} className="text-xs text-ct-gris underline hover:text-ct-rouge">{T.retirer}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {dossier.statut !== 'ferme' && (
          <div className="mt-4">
            <textarea value={texte} onChange={(e) => { setTexte(e.target.value); setApercu(null); }} rows={5}
              placeholder={'1480 rue Marie-Anne Est\t2024-05-17\t1 250 000 $\n1455 rue Gilford\t2024-02-02\t985 000 $'}
              className="w-full rounded-xl border border-ct-ligne px-4 py-3 font-mono text-sm outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={preparer} disabled={!texte.trim()} className="rounded-xl border border-ct-vert px-4 py-2 font-semibold text-ct-vert transition hover:bg-ct-vert-pale disabled:opacity-50">{T.lire}</button>
              {nBonnes > 0 && (
                <button type="button" onClick={ajouter} disabled={ajout} className="rounded-xl bg-ct-vert px-4 py-2 font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50">
                  {ajout ? T.ajout : `${T.ajouter} ${nBonnes} ${nBonnes > 1 ? T.ventes : T.vente}`}
                </button>
              )}
            </div>
            {apercu && (
              <ul className="mt-3 grid gap-1 text-sm">
                {apercu.map((v, i) => (
                  <li key={i} className={v.probleme ? 'text-ct-rouge' : ''}>
                    {v.probleme ? `✕ « ${v.brut} » : ${v.probleme}` : `✓ ${v.adresse} · ${v.date} · ${fmtDollars(langue, v.prix!)}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{T.notesTitre}</h2>
        <p className="mt-1 text-sm text-ct-gris">{T.notesNote}</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={4000} className="mt-3 w-full rounded-xl border border-ct-ligne px-4 py-3 outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={enregistrerNotes} className="rounded-xl border border-ct-vert px-4 py-2 font-semibold text-ct-vert transition hover:bg-ct-vert-pale">{T.enregistrer}</button>
          {notesEnregistrees && <span className="text-sm text-emerald-800">{T.enregistre}</span>}
        </div>
      </section>
    </main>
  );
}
