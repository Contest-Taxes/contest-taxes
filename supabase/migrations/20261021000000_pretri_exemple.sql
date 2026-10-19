-- Exemple de la page d'accueil (2026-10-19, demande de Guillaume) : à chaque
-- ouverture de la page, un immeuble de Montréal tiré au hasard alimente la carte
-- « En une seconde » (sa hausse, la médiane de ses comparables, leur nombre, et
-- ce que chaque pourcent de hausse représente en taxes par année).
-- Tirage restreint aux maisons et plex « dans la norme » (moins d'un écart-type
-- de la médiane), bâtiment inchangé : la page n'expose ainsi aucun immeuble
-- signalé, et la liste de ciblage (les hausses hors norme) ne se lit pas en
-- rechargeant l'accueil. Le 1482 rue Marie-Anne Est est exclu.
-- Appliqué à la main le 2026-10-19. Idempotent.

create or replace function public.pretri_exemple(p_ville text default '66023')
returns jsonb language plpgsql volatile as $$
declare
  p public.pretri; u public.unites; tx public.taux_taxation; prm public.pretri_parametres;
  essai integer := 0;
begin
  select pp.* into prm from public.pretri_parametres pp
   where pp.ville = p_ville order by pp.millesime_apres desc limit 1;
  if not found then
    return null;
  end if;
  loop
    essai := essai + 1;
    select t.* into p from public.pretri t tablesample system (0.5)
     where t.ville = p_ville and t.millesime_apres = prm.millesime_apres
       and not t.batiment_modifie and t.ecart_sigma is not null and abs(t.ecart_sigma) < 1
       and t.classe in ('maison', 'plex') and t.matricule <> '9943-03-5251-0-000-0000'
     order by random() limit 1;
    exit when p.matricule is not null or essai >= 6;
  end loop;
  if p.matricule is null then
    return null;
  end if;
  select x.* into u from public.unites x
   where x.ville = p.ville and x.matricule = p.matricule order by x.id_uev limit 1;
  if u.matricule is null then
    return null;
  end if;
  select * into tx from public.taux_taxation x
   where x.ville = p.ville and x.arrondissement = coalesce(p.arrondissement, '') order by x.annee desc limit 1;
  if not found then
    select * into tx from public.taux_taxation x
     where x.ville = p.ville and x.arrondissement = '' order by x.annee desc limit 1;
  end if;
  return jsonb_build_object(
    'adresse', u.civique_debut ||
        case when u.civique_fin <> u.civique_debut then ' - ' || u.civique_fin else '' end ||
        ' ' || regexp_replace(regexp_replace(u.rue, '\s*\([^)]*\)\s*$', ''), '(\m[dDlL][''’]) ', '\1', 'g'),
    'ville', prm.nom,
    'hausse_pct', p.hausse_pct,
    'mediane_pct', p.secteur_mediane,
    'n_comparables', p.secteur_n,
    'cout_pourcent', case when tx.taux_pct is null then null
                          else round(p.valeur_avant * 0.01 * tx.taux_pct / 100) end);
end $$;

revoke execute on function public.pretri_exemple(text) from public, anon, authenticated;
grant execute on function public.pretri_exemple(text) to service_role;
