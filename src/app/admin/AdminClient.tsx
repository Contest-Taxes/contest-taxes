'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabaseClient';
import { STYLE_STATUT, nomFichierRapport, type MessageContact, type Rapport, type Statut } from '@/lib/espace/types';
import Bandeau from '@/components/espace/Bandeau';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { fmtDate, t } from '@/lib/i18n/textes';

// Administration (rôle admin dans profils) : tous les dossiers avec leur
// propriétaire, changement de statut, dépôt d'un rapport PDF par langue,
// messages du formulaire de contact. Tout passe par les règles d'accès de la base.

interface DossierAdmin {
  id: string;
  adresse: string;
  ville: string | null;
  statut: Statut;
  langue: 'fr' | 'en';
  cree_le: string;
  proprietaire: string;
  notes_client: string | null;
  unite: { couverture?: { millesime?: number } | null } | null;
  profils: { courriel: string | null; nom: string | null } | null;
  dossier_ventes: { count: number }[];
  dossier_rapports: Rapport[];
}

export default function AdminClient() {
  const supabase = getSupabase();
  const router = useRouter();
  const { langue } = useLangue();
  const T = t(langue).admin;
  const TE = t(langue).espace;
  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [dossiers, setDossiers] = useState<DossierAdmin[]>([]);
  const [messages, setMessages] = useState<MessageContact[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [langueDepot, setLangueDepot] = useState<Record<string, 'fr' | 'en'>>({});

  const charger = useCallback(async () => {
    const { data: d, error: e1 } = await supabase
      .from('dossiers')
      .select('id, adresse, ville, statut, langue, cree_le, proprietaire, notes_client, unite, profils(courriel, nom), dossier_ventes(count), dossier_rapports(*)')
      .order('cree_le', { ascending: false });
    if (e1) setErreur(e1.message); else setDossiers((d as unknown as DossierAdmin[]) ?? []);
    const { data: m, error: e2 } = await supabase.from('messages_contact').select('*').order('cree_le', { ascending: false }).limit(100);
    if (e2) setErreur(e2.message); else setMessages((m as MessageContact[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth?next=%2Fadmin'); return; }
      const { data: p } = await supabase.from('profils').select('role').eq('id', data.session.user.id).maybeSingle();
      const ok = p?.role === 'admin';
      setAutorise(ok);
      if (ok) charger();
    });
  }, [supabase, router, charger]);

  async function changerStatut(d: DossierAdmin, statut: Statut) {
    setOccupe(d.id);
    const { error } = await supabase.from('dossiers').update({ statut }).eq('id', d.id);
    setOccupe(null);
    if (error) setErreur(error.message); else charger();
  }

  async function deposer(d: DossierAdmin, fichier: File) {
    const lg = langueDepot[d.id] ?? d.langue ?? 'fr';
    setOccupe(d.id);
    setErreur(null);
    const chemin = `${d.proprietaire}/${d.id}/${lg}/analyse.pdf`;
    const { error: e1 } = await supabase.storage.from('rapports').upload(chemin, fichier, { upsert: true, contentType: 'application/pdf' });
    if (e1) { setErreur(`${T.depotRefuse} ${e1.message}`); setOccupe(null); return; }
    const annee = d.unite?.couverture?.millesime ?? new Date().getFullYear();
    const { error: e2 } = await supabase.from('dossier_rapports').upsert(
      { dossier_id: d.id, langue: lg, chemin, nom_fichier: nomFichierRapport(lg, d.adresse, annee), annee, depose_le: new Date().toISOString() },
      { onConflict: 'dossier_id,langue' },
    );
    setOccupe(null);
    if (e2) setErreur(e2.message); else charger();
  }

  async function traiter(m: MessageContact) {
    const { error } = await supabase.from('messages_contact').update({ traite: !m.traite }).eq('id', m.id);
    if (error) setErreur(error.message); else charger();
  }

  if (autorise === null) return <div className="conteneur">…</div>;
  if (!autorise) return <div className="conteneur"><p>{T.reserve}</p><p className="mt-3"><Link href="/dashboard" className="underline">{TE.retour}</Link></p></div>;

  return (
    <>
    <Bandeau retour={{ href: '/dashboard', libelle: TE.retour }} surtitre={TE.surtitre} titre={T.titre} />
    <div className="conteneur">
      {erreur && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-ct-rouge-pale p-3 text-sm text-ct-rouge">{erreur}</p>}

      <section>
        <h2 className="font-display text-[26px] font-medium">{T.dossiers} ({dossiers.length})</h2>
        <div className="mt-3 grid gap-3">
          {dossiers.map((d) => (
            <div key={d.id} className={`rounded-2xl border border-ct-ligne border-l-[6px] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(30,34,35,0.05)] ${(STYLE_STATUT[d.statut] ?? STYLE_STATUT.nouveau).lisere}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/dashboard/dossier/${d.id}`} className="font-display text-[22px] font-medium hover:text-ct-vert">{d.adresse}</Link>
                  <p className="text-sm text-ct-gris">
                    {d.profils?.nom ? `${d.profils.nom} · ` : ''}{d.profils?.courriel ?? d.proprietaire} · {T.ouvertLe} {fmtDate(langue, d.cree_le)} · {d.dossier_ventes?.[0]?.count ?? 0} {T.ventes}
                    {' · '}{d.langue.toUpperCase()}
                  </p>
                  {d.dossier_rapports?.length > 0 && (
                    <p className="text-sm text-ct-gris">{T.rapportDepose} : {d.dossier_rapports.map((r) => `${r.langue.toUpperCase()} (${fmtDate(langue, r.depose_le)})`).join(', ')}</p>
                  )}
                  {d.notes_client && <p className="mt-1 text-sm italic text-ct-encre">« {d.notes_client} »</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <select value={d.statut} disabled={occupe === d.id} onChange={(e) => changerStatut(d, e.target.value as Statut)} className="rounded-lg border border-ct-ligne px-2 py-1.5">
                    {(Object.keys(TE.statuts) as Statut[]).map((s) => <option key={s} value={s}>{TE.statuts[s]}</option>)}
                  </select>
                  <select value={langueDepot[d.id] ?? d.langue ?? 'fr'} onChange={(e) => setLangueDepot({ ...langueDepot, [d.id]: e.target.value as 'fr' | 'en' })} className="rounded-lg border border-ct-ligne px-2 py-1.5" aria-label="Langue du rapport">
                    <option value="fr">FR</option><option value="en">EN</option>
                  </select>
                  <label className="cursor-pointer rounded-lg border border-ct-vert px-3 py-1.5 font-medium text-ct-vert hover:bg-ct-vert-pale">
                    {d.dossier_rapports?.some((r) => r.langue === (langueDepot[d.id] ?? d.langue ?? 'fr')) ? T.remplacer : T.deposer}
                    <input type="file" accept="application/pdf" className="hidden" disabled={occupe === d.id}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) deposer(d, f); e.target.value = ''; }} />
                  </label>
                </div>
              </div>
            </div>
          ))}
          {dossiers.length === 0 && <p className="text-ct-gris">{T.aucunDossier}</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-[26px] font-medium">{T.messages} ({messages.filter((m) => !m.traite).length} {T.aTraiter})</h2>
        <div className="mt-3 grid gap-3">
          {messages.map((m) => (
            <div key={m.id} className={`rounded-2xl border p-4 shadow-sm ${m.traite ? 'border-ct-ligne bg-gray-50 text-ct-gris' : 'border-ct-ligne bg-white'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.nom} <a href={`mailto:${m.courriel}`} className="font-normal underline">{m.courriel}</a></p>
                  <p className="text-sm text-ct-gris">{fmtDate(langue, m.cree_le)}{m.adresse && ` · ${m.adresse}`}</p>
                </div>
                <button type="button" onClick={() => traiter(m)} className="rounded-lg border border-ct-ligne px-3 py-1.5 text-sm hover:border-ct-encre">{m.traite ? T.rouvrir : T.traiter}</button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-ct-gris">{T.aucunMessage}</p>}
        </div>
      </section>
    </div>
    </>
  );
}
