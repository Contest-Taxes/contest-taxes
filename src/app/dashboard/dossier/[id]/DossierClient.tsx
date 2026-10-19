'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabaseClient';
import { STYLE_STATUT, type Dossier, type Rapport, type Statut, type Vente } from '@/lib/espace/types';
import { analyserVentes, type VenteSaisie } from '@/lib/espace/ventes';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { fmtDate, fmtDollars, fmtPct, t } from '@/lib/i18n/textes';
import { telechargerAnalysePdf } from '@/lib/pretri/pdfClient';
import Bandeau from '@/components/espace/Bandeau';

// Un dossier (planche « Espace client : un dossier ») : bandeau d'encre avec
// l'adresse, carte de statut à liseré avec les rapports et l'analyse
// préliminaire en PDF, les étapes en colonne, les chiffres de l'analyse
// préliminaire à l'ouverture, les ventes fournies et les notes du client.

const VENTES_VISIBLES = 8;
const ORDRE: Statut[] = ['nouveau', 'ventes_recues', 'en_analyse', 'rapport_disponible'];

export default function DossierClient({ id }: { id: string }) {
  const supabase = getSupabase();
  const router = useRouter();
  const { langue } = useLangue();
  const T = t(langue).espace;
  const TF = t(langue).formulaire;
  const [dossier, setDossier] = useState<Dossier | null | undefined>(undefined);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [toutesVentes, setToutesVentes] = useState(false);
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

  async function telecharger(chemin: string, nomFichier: string) {
    const { data, error } = await supabase.storage.from('rapports').createSignedUrl(chemin, 600, { download: nomFichier });
    if (error || !data) { setErreur(error?.message ?? TF.erreur); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
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

  if (dossier === undefined) return <div className="conteneur">…</div>;
  if (dossier === null) {
    return <div className="conteneur"><p>{T.inexistant}</p><p className="mt-3"><Link href="/dashboard" className="underline">{T.retour}</Link></p></div>;
  }
  const c = dossier.unite?.chiffres ?? null;
  const u = dossier.unite?.unite ?? null;
  const st = STYLE_STATUT[dossier.statut] ?? STYLE_STATUT.nouveau;
  const nBonnes = apercu ? apercu.filter((v) => !v.probleme).length : 0;
  const ventesAffichees = toutesVentes ? ventes : ventes.slice(0, VENTES_VISIBLES);
  const sousTitre = [
    u?.logements != null ? `${u.logements} ${u.logements > 1 ? TF.logements : TF.logement}` : null,
    u?.annee_construction != null ? `${TF.construit} ${u.annee_construction}` : null,
    `${T.ouvertLeDossier} ${fmtDate(langue, dossier.cree_le)}`,
  ].filter(Boolean).join(' · ');

  // Étapes : faites (coche verte), en cours (numéro sur encre), à venir (numéro gris).
  const rang = dossier.statut === 'ferme' ? ORDRE.length : ORDRE.indexOf(dossier.statut);
  const languesRapports = Array.from(new Set(rapports.map((r) => r.langue))).map((l) => (l === 'fr' ? T.enFrancais : T.enAnglais)).join(` ${T.et} `);
  const etapes = [
    { titre: T.etapeOuvert, detail: fmtDate(langue, dossier.cree_le) },
    { titre: T.etapeVentes, detail: ventes.length ? `${ventes.length} ${ventes.length > 1 ? T.ventes : T.vente}` : T.enAttente },
    { titre: T.etapeAnalyse, detail: T.etapeAnalyseDetail },
    { titre: T.etapeRapport, detail: rapports.length ? languesRapports : T.aVenir },
  ];

  return (
    <>
      <Bandeau retour={{ href: '/dashboard', libelle: T.retour }} titre={dossier.adresse} sousTitre={sousTitre} />

      <div className="conteneur flex flex-col gap-7">
        {erreur && <p role="alert" className="rounded-xl border border-red-200 bg-ct-rouge-pale p-3 text-sm text-ct-rouge">{erreur}</p>}

        <div className="grid items-start gap-6 lg:grid-cols-12">
          <section aria-labelledby="titre-statut" className={`flex flex-col gap-3.5 rounded-2xl border border-ct-ligne border-l-[6px] bg-white px-8 py-7 shadow-[0_10px_30px_rgba(30,34,35,0.06)] lg:col-span-8 ${st.lisere}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ct-vert-fonce">{T.ouEnEst}</p>
            <h2 id="titre-statut" className="font-display text-[30px] font-medium leading-[1.15]">{T.statuts[dossier.statut]}</h2>
            <p className="leading-relaxed">{T.etapes[dossier.statut]}</p>
            {rapports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ct-ligne bg-ct-fond px-4.5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-full bg-ct-encre px-2.5 py-0.5 text-[11px] font-bold tracking-[0.08em] text-white">{r.langue.toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="break-all font-semibold">{r.nom_fichier}</p>
                    <p className="mt-0.5 text-[13px] text-ct-gris">{T.deposeLe.charAt(0).toUpperCase() + T.deposeLe.slice(1)} {fmtDate(langue, r.depose_le)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => telecharger(r.chemin, r.nom_fichier)} className="rounded-xl bg-ct-encre px-5 py-3 font-semibold text-white transition hover:bg-black">{T.telechargerPdf}</button>
              </div>
            ))}
            {rapports.length === 0 && dossier.statut === 'rapport_disponible' && dossier.rapport_chemin && (
              <button type="button" onClick={() => telecharger(dossier.rapport_chemin!, 'rapport.pdf')} className="self-start rounded-xl bg-ct-encre px-5 py-3 font-semibold text-white transition hover:bg-black">{T.telechargerPdf}</button>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-ct-ligne pt-3.5">
              <button type="button" onClick={analysePdf} disabled={pdfEnCours} className="rounded-xl border border-ct-encre px-4.5 py-3 font-semibold text-ct-encre transition hover:bg-ct-fond disabled:opacity-50">
                {pdfEnCours ? T.analysePdfEnCours : T.analysePdf}
              </button>
              <span className="text-[13px] text-ct-gris">{T.analysePdfNote}</span>
            </div>
          </section>

          <aside aria-labelledby="titre-etapes" className="flex flex-col gap-2.5 rounded-2xl bg-ct-fond p-6 lg:col-span-4">
            <h3 id="titre-etapes" className="font-display text-[22px] font-medium">{T.etapesTitre}</h3>
            <ol className="flex flex-col gap-2.5 text-sm">
              {etapes.map((e, i) => {
                const fait = i < rang || dossier.statut === 'ferme';
                const courant = i === rang;
                return (
                  <li key={e.titre} className="flex items-start gap-2.5">
                    <span aria-hidden="true"
                      className={`inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-xs font-bold ${fait ? 'bg-ct-vert text-white' : courant ? 'bg-ct-encre text-white' : 'bg-[#e4e6e2] text-ct-gris'}`}>
                      {fait ? '✓' : i + 1}
                    </span>
                    <span className={fait || courant ? '' : 'text-ct-gris'}>
                      <strong>{e.titre}</strong><br /><span className="text-ct-gris">{e.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>

        {c && (
          <section aria-labelledby="titre-disait" className="flex flex-col gap-3 rounded-2xl border border-ct-ligne bg-white px-7 py-6">
            <h2 id="titre-disait" className="font-display text-2xl font-medium">{T.disaitTitre}</h2>
            {dossier.unite?.titre && <p className="text-sm text-ct-gris">{dossier.unite.titre}</p>}
            <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <div className="rounded-xl bg-ct-fond p-3"><dt className="text-ct-gris">{T.rolePrec}</dt><dd className="mt-0.5 text-lg font-semibold">{fmtDollars(langue, c.valeur_precedente)}</dd></div>
              <div className="rounded-xl bg-ct-fond p-3"><dt className="text-ct-gris">{T.role} {c.role_libelle ?? ''}</dt><dd className="mt-0.5 text-lg font-semibold">{fmtDollars(langue, c.valeur_proposee)}</dd></div>
              <div className="rounded-xl bg-ct-fond p-3"><dt className="text-ct-gris">{T.hausse}</dt><dd className="mt-0.5 text-lg font-semibold">{fmtPct(langue, c.hausse_pct)}</dd></div>
              <div className="rounded-xl bg-ct-fond p-3"><dt className="text-ct-gris">{T.mediane}</dt><dd className="mt-0.5 text-lg font-semibold">{c.secteur_mediane_pct != null ? fmtPct(langue, c.secteur_mediane_pct) : '—'}</dd></div>
            </dl>
          </section>
        )}

        <section aria-labelledby="titre-ventes" className="flex flex-col gap-3 rounded-2xl border border-ct-ligne bg-white px-7 py-6">
          <h2 id="titre-ventes" className="font-display text-2xl font-medium">{T.ventesTitre}</h2>
          <p className="text-sm leading-relaxed text-ct-gris">{T.ventesNote}</p>
          {ventes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-ct-gris"><th className="py-1.5 font-medium">{T.adresse}</th><th className="py-1.5 font-medium">{T.date}</th><th className="py-1.5 text-right font-medium">{T.prix}</th><th></th></tr></thead>
                <tbody>
                  {ventesAffichees.map((v) => (
                    <tr key={v.id} className="border-t border-ct-ligne">
                      <td className="py-2 text-left">{v.adresse}</td>
                      <td className="py-2 text-left">{v.date_vente ?? '—'}</td>
                      <td className="py-2 text-right">{v.prix != null ? fmtDollars(langue, Number(v.prix)) : '—'}</td>
                      <td className="py-2 text-right"><button type="button" onClick={() => retirer(v)} className="text-xs text-ct-gris underline hover:text-ct-rouge">{T.retirer}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ventes.length > VENTES_VISIBLES && (
            <button type="button" onClick={() => setToutesVentes(!toutesVentes)} className="self-start text-[13px] text-ct-gris underline hover:text-ct-encre">
              {toutesVentes ? T.masquer : `${T.afficher} ${ventes.length - VENTES_VISIBLES} ${T.autresVentes}`}
            </button>
          )}
          {dossier.statut !== 'ferme' && (
            <>
              <label className="sr-only" htmlFor="ventes">{T.ventesTitre}</label>
              <textarea id="ventes" value={texte} onChange={(e) => { setTexte(e.target.value); setApercu(null); }} rows={4}
                placeholder={'1480 rue Marie-Anne Est\t2024-05-17\t1 250 000 $'}
                className="w-full rounded-xl border border-ct-ligne px-4 py-3 font-mono text-sm outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
              <div className="flex flex-wrap gap-2.5">
                <button type="button" onClick={() => setApercu(analyserVentes(texte))} disabled={!texte.trim()} className="rounded-xl border border-ct-vert px-4 py-2.5 font-semibold text-ct-vert-fonce transition hover:bg-ct-vert-pale disabled:opacity-50">{T.lire}</button>
                {nBonnes > 0 && (
                  <button type="button" onClick={ajouter} disabled={ajout} className="rounded-xl bg-ct-vert px-4 py-2.5 font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50">
                    {ajout ? T.ajout : `${T.ajouter} ${nBonnes} ${nBonnes > 1 ? T.ventes : T.vente}`}
                  </button>
                )}
              </div>
              {apercu && (
                <ul className="grid gap-1 text-sm">
                  {apercu.map((v, i) => (
                    <li key={i} className={v.probleme ? 'text-ct-rouge' : ''}>
                      {v.probleme ? `✕ « ${v.brut} » : ${v.probleme}` : `✓ ${v.adresse} · ${v.date} · ${fmtDollars(langue, v.prix!)}`}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="titre-notes" className="flex flex-col gap-2.5 rounded-2xl border border-ct-ligne bg-white px-7 py-6">
          <h2 id="titre-notes" className="font-display text-2xl font-medium">{T.notesTitre}</h2>
          <p className="text-sm text-ct-gris">{T.notesNote}</p>
          <label className="sr-only" htmlFor="notes">{T.notesTitre}</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000} className="w-full rounded-xl border border-ct-ligne px-4 py-3 outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20" />
          <div className="flex items-center gap-3">
            <button type="button" onClick={enregistrerNotes} className="rounded-xl border border-ct-vert px-4 py-2.5 font-semibold text-ct-vert-fonce transition hover:bg-ct-vert-pale">{T.enregistrer}</button>
            {notesEnregistrees && <span className="text-sm text-emerald-800">{T.enregistre}</span>}
          </div>
        </section>
      </div>
    </>
  );
}
