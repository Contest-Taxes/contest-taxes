-- Pré-tri Contest-Taxes : schéma, index, verrouillage et fonctions SQL.
-- Appliqué à la main le 2026-10-10 (psql, pooler de session). Idempotent.
-- Les tables sont remplies par le moteur : ~/Desktop/Contest-Taxes/sql/charger_pretri.sql
-- Fonctions portées de contestaxes.opendata (normaliser_rue, decouper_adresse,
-- apparier, diagnostiquer_adresse) et contestaxes.pretri.evaluer ; validées
-- 36/36 contre le moteur Python sur des adresses sans ambiguïté.

-- Extensions (schéma « extensions », convention Supabase)
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------
-- Index d'adresses : unités d'évaluation de l'agglomération
-- ---------------------------------------------------------------
create table if not exists public.unites (
  id_uev              bigint primary key,
  civique_debut       integer,
  civique_fin         integer,
  rue                 text,
  rue_norm            text,
  municipalite        text,
  etages              smallint,
  logements           smallint,
  annee_construction  smallint,
  utilisation         text,
  categorie           text,
  matricule           text,
  superficie_terrain  numeric,
  superficie_batiment numeric,
  lat                 double precision,
  lon                 double precision
);
comment on table public.unites is
  'Unités d''évaluation de l''agglomération de Montréal (données ouvertes « unites-evaluation-fonciere »). Index d''adresses du pré-tri. Source : data/index_unites.csv du moteur contestaxes. rue_norm = contestaxes.opendata.normaliser_rue (sans accents, minuscules, sans articles).';

-- ---------------------------------------------------------------
-- Pré-tri : position de chaque immeuble par rapport à ses semblables
-- ---------------------------------------------------------------
create table if not exists public.pretri (
  ville               text     not null,   -- code géographique MAMH (66023 = Montréal)
  millesime_avant     smallint not null,
  millesime_apres     smallint not null,
  matricule           text     not null,
  division            text     not null,   -- 4 premiers chiffres du matricule, cellule ~1 km
  logements           smallint,
  role_libelle        text,
  aire_etages_m2      numeric,
  valeur_avant        numeric,
  valeur_apres        numeric,
  hausse_pct          double precision,
  secteur_mediane     double precision,
  secteur_ecart_type  double precision,   -- écart interdécile / 2,5631
  secteur_n           integer,
  ecart_sigma         double precision,
  centile             double precision,
  batiment_modifie    boolean  not null default false,
  comparaison         text,
  primary key (ville, millesime_apres, matricule)
);
comment on table public.pretri is
  'Table de pré-tri calculée par contestaxes.pretri.construire_table : hausse au rôle de chaque immeuble résidentiel de 1 à 5 logements et sa position (en écarts-types interdéciles) par rapport à sa cellule cadastrale. Source : data/pretri_<ville>_<avant>_<apres>.csv.';

create table if not exists public.chargements (
  id          serial primary key,
  charge_le   timestamptz not null default now(),
  table_cible text not null,
  fichier     text not null,
  lignes      integer not null,
  note        text
);

-- Index
create index if not exists unites_rue_civique_idx on public.unites (rue_norm, civique_debut);
create index if not exists unites_matricule_idx   on public.unites (matricule);
create index if not exists pretri_matricule_idx   on public.pretri (matricule);

-- Rien n'est lisible par l'API publique : RLS activée sans politique, droits retirés
alter table public.unites      enable row level security;
alter table public.pretri      enable row level security;
alter table public.chargements enable row level security;
revoke all on public.unites, public.pretri, public.chargements from anon, authenticated;

create table if not exists public.voies (
  rue_norm      text primary key,
  rue           text not null,      -- libellé le plus fréquent, pour l'affichage
  n_unites      integer not null,
  civique_min   integer,
  civique_max   integer
);
comment on table public.voies is 'Voies distinctes de public.unites (dérivée). Sert aux suggestions quand une voie est inconnue et au diagnostic des plages de numéros civiques.';
-- (le remplissage de voies est fait par le script de chargement du moteur)
create index if not exists voies_trgm_idx on public.voies using gin (rue_norm extensions.gin_trgm_ops);
alter table public.voies enable row level security;
revoke all on public.voies from anon, authenticated;

-- ---------------------------------------------------------------
-- Normalisation d'une voie : port exact de contestaxes.opendata.normaliser_rue
-- ---------------------------------------------------------------
create or replace function public.rue_normaliser(nom text) returns text
language plpgsql immutable strict as $$
declare
  s text; m text; res text[] := '{}';
begin
  if btrim(nom) = '' then return ''; end if;
  s := lower(extensions.unaccent(nom));
  s := regexp_replace(s, '\([^)]*\)', ' ', 'g');            -- suffixe d'arrondissement
  s := replace(replace(s, '''', ' '), '`', ' ');
  s := regexp_replace(s, '[^a-z0-9 -]', ' ', 'g');
  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  if    s like 'st-%'   then s := 'saint-'     || substr(s, 4);
  elsif s like 'ste-%'  then s := 'sainte-'    || substr(s, 5);
  elsif s like 'boul %' then s := 'boulevard ' || substr(s, 6);
  elsif s like 'av %'   then s := 'avenue '    || substr(s, 4);
  elsif s like 'ave %'  then s := 'avenue '    || substr(s, 5);
  end if;
  foreach m in array string_to_array(s, ' ') loop
    if m not in ('de','des','du','d','la','le','les','l') then res := res || m; end if;
  end loop;
  return case when coalesce(array_length(res, 1), 0) = 0 then s else array_to_string(res, ' ') end;
end $$;

-- « 4438 - 4446 Rue Garnier » -> (4438, 4446, 'rue garnier')  (decouper_adresse)
create or replace function public.adresse_decouper(adresse text,
  out civique_debut integer, out civique_fin integer, out rue_norm text)
language plpgsql immutable strict as $$
declare s text; m text[];
begin
  s := btrim(regexp_replace(adresse, '\s+', ' ', 'g'));
  m := regexp_match(s, '^(\d+)\s*(?:[-–]\s*(\d+))?\s+(.*)$');
  if m is null then
    civique_debut := null; civique_fin := null; rue_norm := public.rue_normaliser(s);
  else
    civique_debut := m[1]::integer;
    civique_fin   := coalesce(m[2]::integer, civique_debut);
    rue_norm      := public.rue_normaliser(m[3]);
  end if;
end $$;

-- Appariement : numéro exact, puis chevauchement de plage (opendata.apparier)
create or replace function public.unite_apparier(adresse text) returns public.unites
language sql stable strict as $$
  with d as (select * from public.adresse_decouper(adresse)),
  exact as (
    select u.* from public.unites u, d
    where d.civique_debut is not null and d.rue_norm <> ''
      and u.rue_norm = d.rue_norm and u.civique_debut = d.civique_debut
    order by u.id_uev limit 1),
  chev as (
    select u.* from public.unites u, d
    where d.civique_debut is not null and d.rue_norm <> ''
      and u.rue_norm = d.rue_norm
      and u.civique_debut <= d.civique_fin and u.civique_fin >= d.civique_debut
    order by u.id_uev limit 1)
  select * from exact union all (select * from chev where not exists (select 1 from exact)) limit 1;
$$;

-- ---------------------------------------------------------------
-- Pré-tri : une adresse -> un verdict structuré (pretri.evaluer)
-- Les textes sont rendus par la couche web ; ici les faits et la catégorie.
-- ---------------------------------------------------------------
create or replace function public.pretri_chercher(adresse text,
                                                  ville text default '66023',
                                                  millesime smallint default 2026)
returns jsonb language plpgsql stable as $$
declare
  d record; u public.unites; p public.pretri; r jsonb; e double precision;
  cat text; voies jsonb; voisins jsonb; lo integer; hi integer;
begin
  select * into d from public.adresse_decouper(adresse);
  if d.rue_norm = '' or d.civique_debut is null then
    return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
      'diagnostic', jsonb_build_object('cas', 'format'));
  end if;

  u := public.unite_apparier(adresse);
  if u.id_uev is null then
    select civique_min, civique_max into lo, hi from public.voies where rue_norm = d.rue_norm;
    if not found then
      -- voie inconnue : suggestions par similarité de trigrammes
      select coalesce(jsonb_agg(rue order by sim desc), '[]'::jsonb) into voies
      from (select rue, extensions.similarity(rue_norm, d.rue_norm) as sim
            from public.voies where rue_norm % d.rue_norm
            order by sim desc limit 6) s;
      return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
        'diagnostic', jsonb_build_object('cas', 'voie_inconnue', 'voie', d.rue_norm,
                                         'voies_proches', voies));
    end if;
    if d.civique_debut < lo or d.civique_debut > hi then
      return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
        'diagnostic', jsonb_build_object('cas', 'hors_plage', 'voie', d.rue_norm,
                                         'plage', jsonb_build_array(lo, hi)));
    end if;
    select coalesce(jsonb_agg(civique_debut || ' ' || regexp_replace(rue, '\s*\([^)]*\)\s*$', '') order by dist), '[]'::jsonb)
      into voisins
    from (select civique_debut, rue, abs(civique_debut - d.civique_debut) as dist
          from public.unites where rue_norm = d.rue_norm order by dist limit 6) s;
    return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
      'diagnostic', jsonb_build_object('cas', 'numero_absent', 'voie', d.rue_norm,
                                       'plage', jsonb_build_array(lo, hi), 'voisins', voisins));
  end if;

  r := jsonb_build_object('trouve', true, 'matricule', u.matricule,
    'unite', jsonb_build_object('adresse', u.civique_debut ||
        case when u.civique_fin <> u.civique_debut then ' - ' || u.civique_fin else '' end ||
        ' ' || regexp_replace(u.rue, '\s*\([^)]*\)\s*$', ''),
      'logements', u.logements, 'categorie', u.categorie, 'utilisation', u.utilisation,
      'annee_construction', u.annee_construction, 'etages', u.etages));

  select * into p from public.pretri t
   where t.ville = pretri_chercher.ville and t.millesime_apres = millesime and t.matricule = u.matricule;
  if not found then
    return r || jsonb_build_object('categorie', 'hors_champ');
  end if;

  e := p.ecart_sigma;
  cat := case when p.batiment_modifie then 'batiment_modifie'
              when e is null          then 'indeterminable'
              when e <= -1            then 'avantageux'
              when e <  1             then 'conforme'
              when e >= 3             then 'hors_proportions'
              when e >= 2             then 'solide'
              else                         'defendable' end;
  return r || jsonb_build_object('categorie', cat,
    'rapport_recommande', cat in ('defendable','solide','hors_proportions'),
    'pretri', jsonb_build_object('role_libelle', p.role_libelle,
      'valeur_precedente', p.valeur_avant, 'valeur_proposee', p.valeur_apres,
      'hausse_pct', p.hausse_pct, 'secteur_mediane_pct', p.secteur_mediane,
      'ecart_sigma', e, 'centile', p.centile, 'n_comparables', p.secteur_n,
      'comparaison', p.comparaison, 'batiment_modifie', p.batiment_modifie));
end $$;

-- Aucun accès par l'API publique : le serveur appelle avec la clé de service
revoke execute on function public.rue_normaliser(text), public.adresse_decouper(text),
  public.unite_apparier(text), public.pretri_chercher(text, text, smallint)
  from public, anon, authenticated;
