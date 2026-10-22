'use client';
import { useLangue } from '@/lib/i18n/LangueProvider';
import { t } from '@/lib/i18n/textes';
import { echeanceRevision } from '@/lib/pretri/echeance';

// Avertissement de l'espace client quand le délai de révision du rôle de
// l'immeuble est passé (art. 130 LFM). Le dossier reste possible : le rapport
// renseigne sur la hausse à partir des ventes, sans pouvoir appuyer une
// contestation si aucune demande n'a été déposée à temps.
// « reference » : le moment où le dossier a été ouvert. Sans elle, le jour
// même (tableau de bord, où le dossier s'ouvre maintenant). Un dossier ouvert
// pendant la période de révision n'affiche donc pas l'avis après coup.
// « niveau » : 3 quand l'avis est imbriqué sous un titre de section.
export default function AvisRoleClos({ roleLibelle, ville, reference, niveau = 2, className = '' }: {
  roleLibelle: string | null | undefined;
  ville: string | null | undefined;
  reference?: Date;
  niveau?: 2 | 3;
  className?: string;
}) {
  const { langue } = useLangue();
  const T = t(langue).espace;
  const e = echeanceRevision(roleLibelle, reference);
  if (!roleLibelle || !e?.passee) return null;
  const Titre = niveau === 3 ? 'h3' : 'h2';
  // Imbriqué, l'avis garde des marges plus étroites sur téléphone.
  const marges = niveau === 3 ? 'px-4 py-4 sm:px-6 sm:py-5' : 'px-6 py-5 sm:px-8';
  const taille = niveau === 3 ? 'text-lg sm:text-[22px]' : 'text-[22px]';
  return (
    <section aria-labelledby="avis-role-clos"
      className={`rounded-2xl border border-[#f2c879] border-l-[6px] border-l-[#d97706] bg-[#fff7e6] ${marges} text-ct-encre ${className}`}>
      <Titre id="avis-role-clos" className={`font-display ${taille} font-medium leading-snug text-[#8a4b08]`}>{T.avisClosTitre}</Titre>
      <p className="mt-2 leading-relaxed">
        {T.avisClosDelai(roleLibelle, ville, e.annee)} (
        <a href={T.avisClosLoiUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-[#d97706] underline-offset-2 hover:text-[#8a4b08]">{T.avisClosLoi}</a>
        ).
      </p>
      <p className="mt-2 leading-relaxed">{T.avisClosUsage}</p>
    </section>
  );
}
