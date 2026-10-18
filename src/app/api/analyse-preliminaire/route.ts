import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { getSupabaseServeur } from '@/lib/supabaseServer';
import { verdict } from '@/lib/pretri/verdict';
import type { ResultatSql } from '@/lib/pretri/types';
import { normaliserLangue } from '@/lib/i18n/langue';
import { DocumentAnalyse } from '@/lib/pdf/AnalysePreliminaire';

// « Version PDF » de l'analyse préliminaire : même recherche que /api/pretri
// (et même limite par connexion), rendue en PDF. Nom du fichier :
// Fr-Analyse_preliminaire_1482-Rue-Marie-Anne-Est_2026.pdf.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function empreinteIp(req: Request): string {
  const brut = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'inconnue';
  return createHash('sha256').update(brut + (process.env.PRETRI_SEL ?? '')).digest('hex');
}

let logoCache: Buffer | null | undefined;
async function logo(): Promise<Buffer | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    logoCache = await readFile(path.join(process.cwd(), 'public', 'logo-icone.png'));
  } catch {
    logoCache = null;
  }
  return logoCache;
}

export async function POST(req: Request) {
  let corps: { adresse?: unknown; langue?: unknown } = {};
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: 'Requête illisible.' }, { status: 400 });
  }
  const adresse = typeof corps.adresse === 'string' ? corps.adresse.replace(/\s+/g, ' ').trim() : '';
  const langue = normaliserLangue(typeof corps.langue === 'string' ? corps.langue : undefined);
  if (!adresse || adresse.length > 120) {
    return NextResponse.json({ erreur: langue === 'fr' ? 'Indiquez une adresse.' : 'Enter an address.' }, { status: 400 });
  }

  const sb = getSupabaseServeur();
  const { data, error } = await sb.rpc('pretri_chercher', { adresse });
  if (error) {
    console.error('pretri_chercher (pdf) :', error.message);
    return NextResponse.json({ erreur: langue === 'fr' ? 'Le service est momentanément indisponible.' : 'The service is temporarily unavailable.' }, { status: 502 });
  }
  const resultat = data as ResultatSql;
  const v = verdict(resultat, adresse, langue);
  if (!v.chiffres || !v.unite) {
    return NextResponse.json({ erreur: langue === 'fr' ? 'L’analyse préliminaire n’a pas trouvé cet immeuble.' : 'The preliminary analysis did not find this building.' }, { status: 404 });
  }
  if (resultat?.matricule) {
    const { data: h } = await sb.rpc('pretri_historique_de', {
      p_ville: resultat.couverture?.ville ?? '66023', p_matricule: resultat.matricule, p_millesime: resultat.couverture?.millesime ?? 2026,
    });
    if (Array.isArray(h)) v.historique = h;
  }
  const { data: journal } = await sb.rpc('pretri_journaliser', {
    p_ip_hash: empreinteIp(req), p_categorie: 'pdf', p_division: resultat?.unite?.division ?? null, p_trouve: true,
  });
  if (journal && journal.autorise === false) {
    return NextResponse.json({ erreur: langue === 'fr' ? 'Trop de recherches depuis votre connexion. Réessayez dans une heure.' : 'Too many searches from your connection. Try again in an hour.' }, { status: 429 });
  }

  const buffer = await renderToBuffer(
    React.createElement(DocumentAnalyse, { verdict: v, adresse, langue, logo: await logo(), genereLe: new Date() }) as unknown as React.ReactElement<DocumentProps>,
  );
  const annee = resultat.couverture?.millesime ?? new Date().getFullYear();
  const slug = (v.unite.adresse_base ?? v.unite.adresse).replace(/\s+/g, '-').replace(/[^\w\-À-ÿ]/g, '');
  const nom = `${langue === 'fr' ? 'Fr' : 'En'}-Analyse_preliminaire_${slug}_${annee}.pdf`;
  const ascii = nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '_');
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nom)}`,
      'X-Nom-Fichier': encodeURIComponent(nom),
      'Cache-Control': 'no-store',
    },
  });
}
