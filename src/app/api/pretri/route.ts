import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabaseServeur } from '@/lib/supabaseServer';
import { verdict } from '@/lib/pretri/verdict';
import type { ResultatSql } from '@/lib/pretri/types';

// Le pré-tri : une adresse entre, un verdict sort. Tout se passe côté serveur ;
// le navigateur ne voit ni la base ni la clé. Une seule adresse par requête,
// pas de point d'accès en masse, et une limite par connexion tenue dans
// Postgres (pretri_journaliser) — la table de pré-tri est aussi la liste de
// ciblage, elle ne doit pas pouvoir être aspirée.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LONGUEUR_MAX = 120;

function empreinteIp(req: Request): string {
  const brut =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'inconnue';
  return createHash('sha256').update(brut + (process.env.PRETRI_SEL ?? '')).digest('hex');
}

export async function POST(req: Request) {
  let corps: { adresse?: unknown } = {};
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: 'Requête illisible.' }, { status: 400 });
  }
  const adresse =
    typeof corps.adresse === 'string' ? corps.adresse.replace(/\s+/g, ' ').trim() : '';
  if (!adresse) {
    return NextResponse.json({ erreur: 'Indiquez une adresse.' }, { status: 400 });
  }
  if (adresse.length > LONGUEUR_MAX) {
    return NextResponse.json({ erreur: 'Adresse trop longue.' }, { status: 400 });
  }

  const sb = getSupabaseServeur();
  const { data, error } = await sb.rpc('pretri_chercher', { adresse });
  if (error) {
    console.error('pretri_chercher :', error.message);
    return NextResponse.json(
      { erreur: 'Le service est momentanément indisponible. Réessayez dans quelques minutes.' },
      { status: 502 }
    );
  }
  const resultat = data as ResultatSql;
  const v = verdict(resultat, adresse);

  const { data: journal, error: erreurJournal } = await sb.rpc('pretri_journaliser', {
    p_ip_hash: empreinteIp(req),
    p_categorie: v.categorie,
    p_division: resultat?.unite?.division ?? null,
    p_trouve: Boolean(resultat?.trouve),
  });
  if (erreurJournal) console.error('pretri_journaliser :', erreurJournal.message);
  if (journal && journal.autorise === false) {
    return NextResponse.json(
      { erreur: 'Trop de recherches depuis votre connexion. Réessayez dans une heure.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  return NextResponse.json(v, { headers: { 'Cache-Control': 'no-store' } });
}
