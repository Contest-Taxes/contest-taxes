import type { Langue } from '@/lib/i18n/langue';

/** Demande l'analyse préliminaire en PDF et déclenche son téléchargement dans le navigateur. */
export async function telechargerAnalysePdf(adresse: string, langue: Langue): Promise<string | null> {
  const rep = await fetch('/api/analyse-preliminaire', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adresse, langue }),
  });
  if (!rep.ok) {
    const corps = await rep.json().catch(() => ({}));
    return (corps as { erreur?: string }).erreur ?? (langue === 'fr' ? 'Une erreur est survenue.' : 'Something went wrong.');
  }
  const blob = await rep.blob();
  const nom = decodeURIComponent(rep.headers.get('X-Nom-Fichier') ?? 'analyse-preliminaire.pdf');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nom; a.click();
  URL.revokeObjectURL(url);
  return null;
}
