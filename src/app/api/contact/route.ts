import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabaseServeur } from '@/lib/supabaseServer';
import { courrielConfigure, envoyerCourriel } from '@/lib/courriel';

// Formulaire « Nous joindre » : le message est d'abord conservé dans la base
// (messages_contact, lisible par l'admin dans l'espace client), puis transmis
// par courriel à l'adresse officielle quand le SMTP est configuré. Une limite
// par connexion est tenue dans Postgres (contact_enregistrer) ; un champ
// invisible piège les robots.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COURRIEL_CONTACT = process.env.CONTACT_EMAIL ?? 'contact@contest-taxes.ca';

function empreinteIp(req: Request): string {
  const brut =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'inconnue';
  return createHash('sha256').update(brut + (process.env.PRETRI_SEL ?? '')).digest('hex');
}

const texte = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export async function POST(req: Request) {
  let corps: Record<string, unknown> = {};
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: 'Requête illisible.' }, { status: 400 });
  }
  const nom = texte(corps.nom, 80);
  const courriel = texte(corps.courriel, 120);
  const adresse = texte(corps.adresse, 120);
  const message = typeof corps.message === 'string' ? corps.message.trim().slice(0, 4000) : '';
  const piege = texte(corps.site, 10);

  if (piege) return NextResponse.json({ ok: true, notifie: false });   // robot : on ne dit rien
  if (!nom) return NextResponse.json({ erreur: 'Indiquez votre nom.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(courriel)) {
    return NextResponse.json({ erreur: 'Indiquez une adresse courriel valide, pour que nous puissions vous répondre.' }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ erreur: 'Écrivez quelques mots de plus : le message est trop court.' }, { status: 400 });
  }

  const sb = getSupabaseServeur();
  const { data, error } = await sb.rpc('contact_enregistrer', {
    p_nom: nom, p_courriel: courriel, p_adresse: adresse, p_message: message, p_ip_hash: empreinteIp(req),
  });
  if (error) {
    console.error('contact_enregistrer', error.message);
    return NextResponse.json({ erreur: "Le message n'a pas pu être enregistré. Écrivez-nous directement à " + COURRIEL_CONTACT + '.' }, { status: 500 });
  }
  if (!data?.ok) {
    return NextResponse.json({ erreur: 'Trop de messages en peu de temps. Réessayez un peu plus tard, ou écrivez-nous directement à ' + COURRIEL_CONTACT + '.' }, { status: 429 });
  }

  let notifie = false;
  if (courrielConfigure()) {
    try {
      const r = await envoyerCourriel({
        a: COURRIEL_CONTACT,
        sujet: `[contest-taxes.ca] Message de ${nom}`,
        texte:
          `Nom : ${nom}\nCourriel : ${courriel}\nImmeuble : ${adresse || '(non indiqué)'}\n` +
          `Message no ${data.id}\n\n${message}\n`,
        repondreA: courriel,
      });
      notifie = r.envoye;
    } catch (e) {
      console.error('courriel de contact', e instanceof Error ? e.message : e);
    }
  } else {
    console.warn(`SMTP non configuré : message de contact no ${data.id} conservé dans messages_contact`);
  }
  return NextResponse.json({ ok: true, notifie });
}
