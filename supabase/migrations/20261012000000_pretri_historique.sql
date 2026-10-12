-- Pré-tri Contest-Taxes, quatrième volet : l'historique des cycles antérieurs.
-- Table compacte (≈ 54 Mo par transition de 371 000 immeubles) : l'essentiel
-- de chaque transition passée, sans coordonnées ni libellés. La transition
-- courante reste dans public.pretri ; pretri_chercher assemble les deux pour
-- rendre, par immeuble, la valeur à chaque rôle et la position par rapport
-- aux comparables à chaque cycle. Appliqué à la main le 2026-10-12. Idempotent.

create table if not exists public.pretri_historique (
  ville            text     not null,
  matricule        text     not null,
  millesime_apres  smallint not null,   -- millésime du fichier qui porte la transition
  role_libelle     text,                -- rôle d'arrivée, ex. « 2020-2021-2022 »
  valeur_avant     integer,
  valeur_apres     integer,
  hausse_pct       real,
  mediane          real,
  sigma            real,
  n                integer,
  ecart            real,
  centile          real,
  rayon_m          smallint,
  batiment_modifie boolean not null default false,
  primary key (ville, matricule, millesime_apres)
);
comment on table public.pretri_historique is 'Transitions de rôle antérieures (compactes) : position de chaque immeuble par rapport à ses bâtiments comparables à chaque cycle. Valeurs de fin de cycle (après révisions). Source : contestaxes.pretri.construire_table.';
alter table public.pretri_historique enable row level security;
revoke all on public.pretri_historique from anon, authenticated;

-- Historique d'un immeuble : transitions passées + courante, du plus ancien au plus récent.
create or replace function public.pretri_historique_de(p_ville text, p_matricule text, p_millesime smallint)
returns jsonb language sql stable as $$
  with h as (
    select millesime_apres, role_libelle, valeur_avant, valeur_apres, hausse_pct::double precision as hausse_pct,
           mediane::double precision as mediane, ecart::double precision as ecart, n, rayon_m::integer as rayon_m, batiment_modifie
    from public.pretri_historique where ville = p_ville and matricule = p_matricule
    union all
    select millesime_apres, role_libelle, valeur_avant::integer, valeur_apres::integer, hausse_pct,
           secteur_mediane, ecart_sigma, secteur_n, rayon_m, batiment_modifie
    from public.pretri where ville = p_ville and matricule = p_matricule and millesime_apres = p_millesime)
  select coalesce(jsonb_agg(jsonb_build_object(
           'millesime', millesime_apres, 'role_libelle', role_libelle,
           'valeur_avant', valeur_avant, 'valeur_apres', valeur_apres, 'hausse_pct', hausse_pct,
           'mediane_pct', mediane, 'ecart_sigma', ecart, 'n_comparables', n, 'rayon_m', rayon_m,
           'batiment_modifie', batiment_modifie) order by millesime_apres), '[]'::jsonb)
  from h;
$$;
revoke execute on function public.pretri_historique_de(text, text, smallint) from public, anon, authenticated;
grant execute on function public.pretri_historique_de(text, text, smallint) to service_role;
