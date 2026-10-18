'use client';
import { FormEvent, useState } from 'react';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { t } from '@/lib/i18n/textes';

const CHAMP =
  'w-full rounded-xl border border-ct-ligne px-4 py-3 outline-none transition focus:border-ct-vert focus:ring-2 focus:ring-ct-vert/20';

export default function ContactForm() {
  const { langue } = useLangue();
  const T = t(langue).contact;
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [adresse, setAdresse] = useState('');
  const [message, setMessage] = useState('');
  const [site, setSite] = useState('');          // piège à robots, jamais affiché
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, courriel, adresse, message, site, langue }),
      });
      const corps = await rep.json();
      if (!rep.ok) setErreur(corps.erreur ?? T.erreur);
      else setEnvoye(true);
    } catch {
      setErreur(T.erreurReseau);
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 leading-relaxed">
        <p className="font-medium">{T.merci}</p>
        <p className="mt-2 text-ct-encre">{T.merciSuite}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-2xl border border-ct-ligne bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{T.nom}</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={80} autoComplete="name" className={CHAMP} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{T.courriel}</span>
          <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} required maxLength={120} autoComplete="email" placeholder="vous@exemple.com" className={CHAMP} />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{T.adresse} <span className="font-normal text-ct-gris">{T.facultatif}</span></span>
        <input value={adresse} onChange={(e) => setAdresse(e.target.value)} maxLength={120} placeholder="1482 Rue Marie-Anne Est, Montréal" className={CHAMP} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{T.message}</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={4000} rows={6} className={CHAMP} />
      </label>
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Site web
          <input tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
        </label>
      </div>
      {erreur && <p role="alert" className="rounded-xl border border-red-200 bg-ct-rouge-pale p-3 text-sm text-ct-rouge">{erreur}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ct-gris">{T.confidentialite}</p>
        <button type="submit" disabled={envoi} className="rounded-xl bg-ct-vert px-6 py-3 font-semibold text-white transition hover:bg-ct-vert-fonce disabled:opacity-50">
          {envoi ? T.envoi : T.envoyer}
        </button>
      </div>
    </form>
  );
}
