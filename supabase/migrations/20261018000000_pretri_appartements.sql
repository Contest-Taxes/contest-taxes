-- Pré-tri Contest-Taxes, neuvième volet : numéros d'appartement des copropriétés.
-- 77,8 % des unités de condo de Montréal partagent leur adresse civique (jusqu'à
-- 593 unités à une adresse) : l'adresse seule ne désigne pas l'unité. Le rôle
-- porte un numéro d'appartement (« suite » dans les données ouvertes de Montréal,
-- RL0101Ix au rôle du MAMH) ; on le charge dans unites et on le lit dans l'adresse
-- saisie (« 1155 rue de la Montagne, app. 316 », « … #316 », « 316-1155 rue … »).
-- Nouvelles catégories : adresse_partagee demande le numéro quand l'adresse est
-- partagée ; appartement_inconnu quand le numéro fourni n'existe pas à l'adresse.
-- Mêmes règles que le moteur (opendata.separer_appartement, normaliser_appartement,
-- apparier_detail). Appliqué à la main le 2026-10-16. Idempotent.

alter table public.unites add column if not exists appartement text;
comment on column public.unites.appartement is 'Numéro d''appartement (suite) normalisé : majuscules, sans zéros initiaux ni espaces ; nul pour la plupart des unités hors copropriété.';

-- « app. 0316 », « #316 », « 316 » -> '316' ; « ph-2 » -> 'PH2'. Même règle que
-- le moteur (opendata.normaliser_appartement).
create or replace function public.appartement_normaliser(a text) returns text
language sql immutable as $$
  select nullif(regexp_replace(regexp_replace(regexp_replace(upper(btrim(a)),
    '^(?:#|(?:N[O°]|APP(?:T|ARTEMENT)?|APT|UNIT[ÉE]|SUITE|LOCAL|BUREAU|LOGEMENT|LOG)(?:\.|(?=\s|#)|$))\s*#?\s*', ''),
    '[\s.\-]+', '', 'g'),
    '^0+(?=\d)', ''), '')
$$;

-- adresse_decouper, troisième version : rend aussi l'appartement. Les paramètres
-- de sortie changent, donc DROP puis CREATE ; les fonctions qui l'appellent sont
-- recréées plus bas.
drop function if exists public.adresse_decouper(text);
create function public.adresse_decouper(adresse text,
  out civique_debut integer, out civique_fin integer, out rue_norm text,
  out ville_norm text, out ville_saisie text, out appartement text)
language plpgsql immutable strict as $$
declare s text; m text[]; parts text[]; p text; i integer; a integer; b integer;
  pref constant text := '(?:#|(?:n[o°]|app(?:t|artement)?|apt|unit[ée]|suite|local|bureau|logement|log)(?:\.|(?=\s|#)))';
begin
  s := btrim(regexp_replace(adresse, '\s+', ' ', 'g'));
  s := regexp_replace(s, '\m[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d\M', ' ', 'g');          -- code postal
  s := regexp_replace(s, '\(\s*(qc|qu[ée]bec|canada)\s*\)', ' ', 'gi');               -- (Québec), (QC)
  parts := regexp_split_to_array(s, '\s*,\s*');
  ville_saisie := ''; appartement := null;
  if coalesce(array_length(parts, 1), 0) >= 2 then
    for i in 2..array_length(parts, 1) loop
      p := btrim(parts[i]);
      if p = '' then continue; end if;
      -- « app. 316 », « #316 », « 316 » après une virgule : un appartement, pas une ville
      if appartement is null and (p ~* ('^' || pref || '\s*#?\s*[a-z0-9][a-z0-9-]{0,5}$')
                                  or p ~* '^(?:[0-9]+[a-z]?|[a-z]{1,2}[- ]?[0-9]+)$') then
        appartement := public.appartement_normaliser(p);
      elsif ville_saisie = '' and lower(extensions.unaccent(p)) not in ('qc', 'canada', 'ca') then   -- « Québec » seul = la ville de Québec
        ville_saisie := p;
      end if;
    end loop;
  end if;
  ville_norm := public.ville_normaliser(ville_saisie);
  s := btrim(regexp_replace(parts[1], '\s+', ' ', 'g'));
  -- appartement en fin de voie : « 1155 rue de la Montagne app. 316 », « … #316 »
  m := regexp_match(s, '[\s,]*' || pref || '\s*#?\s*([a-z0-9][a-z0-9-]{0,5})\s*$', 'i');
  if m is not null then
    appartement := coalesce(public.appartement_normaliser(m[1]), appartement);
    s := rtrim(regexp_replace(s, '[\s,]*' || pref || '\s*#?\s*[a-z0-9][a-z0-9-]{0,5}\s*$', '', 'i'), ' ,');
  end if;
  -- forme postale « 316-1155 rue … » (sans espaces) : appartement-civique, sauf
  -- une courte plage croissante comme « 4438-4446 »
  m := regexp_match(s, '^([0-9]+[a-z]?)[-–]([0-9]+)\s+(\D.*)$', 'i');
  if m is not null then
    a := nullif(regexp_replace(m[1], '\D', '', 'g'), '')::integer; b := m[2]::integer;
    if m[1] ~* '[a-z]$' or a >= b or b - a > 30 then
      appartement := coalesce(appartement, public.appartement_normaliser(m[1]));
      s := m[2] || ' ' || m[3];
    end if;
  end if;
  m := regexp_match(s, '^(\d+)\s*(?:[-–]\s*(\d+))?\s+(.*)$');
  if m is null then
    civique_debut := null; civique_fin := null; rue_norm := public.rue_normaliser(s);
  else
    civique_debut := m[1]::integer;
    civique_fin   := coalesce(m[2]::integer, civique_debut);
    rue_norm      := public.rue_normaliser(m[3]);
  end if;
end $$;

-- unite_apparier : à adresse partagée, l'unité dont l'appartement correspond passe
-- en premier ; sinon la première par id_uev, comme avant.
create or replace function public.unite_apparier(adresse text, p_ville text) returns public.unites
language sql stable as $$
  with d as (select * from public.adresse_decouper(adresse)),
  exact as (
    select u.* from public.unites u, d
    where d.civique_debut is not null and d.rue_norm <> ''
      and (p_ville is null or u.ville = p_ville)
      and u.rue_norm = d.rue_norm and u.civique_debut = d.civique_debut
    order by coalesce(public.appartement_normaliser(u.appartement) = d.appartement, false) desc, u.id_uev limit 1),
  chev as (
    select u.* from public.unites u, d
    where d.civique_debut is not null and d.rue_norm <> ''
      and (p_ville is null or u.ville = p_ville)
      and u.rue_norm = d.rue_norm
      and u.civique_debut <= d.civique_fin and u.civique_fin >= d.civique_debut
    order by coalesce(public.appartement_normaliser(u.appartement) = d.appartement, false) desc, u.id_uev limit 1)
  select * from exact union all (select * from chev where not exists (select 1 from exact)) limit 1;
$$;
create or replace function public.unite_apparier(adresse text) returns public.unites
language sql stable strict as $$ select * from public.unite_apparier(adresse, null::text) $$;

drop function if exists public.pretri_chercher(text, text, smallint);
create or replace function public.pretri_chercher(adresse text,
                                                  p_ville text default null,
                                                  p_millesime smallint default null)
returns jsonb language plpgsql stable as $$
declare
  d record; u public.unites; p public.pretri; r jsonb; e double precision;
  cat text; voies jsonb; voisins jsonb; lo integer; hi integer;
  n_exact integer; n_chev integer; n_unites integer; grp jsonb;
  dlat double precision; dlon double precision; lat0 double precision;
  tx public.taux_taxation; taux jsonb; vl public.villes;
  cible text; mil smallint; villes_trouvees text[]; prm public.pretri_parametres; couv jsonb;
  fr public.frais_revision; frais jsonb;
  n_app integer; app_ex text; apps jsonb; app_aff text; adresse_base text;
begin
  select * into d from public.adresse_decouper(adresse);
  -- Ville nommée après la virgule : reconnue ? couverte ?
  if d.ville_norm <> '' then
    select * into vl from public.villes where nom_norm = d.ville_norm;
    if not found then
      return jsonb_build_object('trouve', false, 'categorie', 'ville_inconnue', 'ville', d.ville_saisie);
    elsif not exists (select 1 from public.pretri_parametres pp where pp.ville = vl.code) then
      return jsonb_build_object('trouve', false, 'categorie', 'ville_non_couverte', 'ville', vl.nom, 'ville_code', vl.code);
    end if;
    cible := vl.code;
  end if;
  cible := coalesce(cible, p_ville);
  if d.rue_norm = '' or d.civique_debut is null then
    return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
      'diagnostic', jsonb_build_object('cas', 'format'));
  end if;

  if cible is null then
    -- Ville non nommée : l'adresse existe-t-elle dans une seule ville chargée ?
    select array_agg(distinct x.ville) into villes_trouvees from public.unites x
     where x.ville is not null and x.rue_norm = d.rue_norm and x.civique_debut = d.civique_debut
       and exists (select 1 from public.pretri_parametres pp where pp.ville = x.ville);
    if villes_trouvees is null then
      select array_agg(distinct x.ville) into villes_trouvees from public.unites x
       where x.ville is not null and x.rue_norm = d.rue_norm
         and x.civique_debut <= d.civique_fin and x.civique_fin >= d.civique_debut
         and exists (select 1 from public.pretri_parametres pp where pp.ville = x.ville);
    end if;
    if coalesce(cardinality(villes_trouvees), 0) >= 2 then
      return jsonb_build_object('trouve', false, 'categorie', 'adresse_ambigue',
        'villes', (select jsonb_agg(pp.nom order by pp.nom) from public.pretri_parametres pp where pp.ville = any(villes_trouvees)));
    end if;
    cible := coalesce(villes_trouvees[1], '66023');
  end if;
  select pp.* into prm from public.pretri_parametres pp
   where pp.ville = cible and (p_millesime is null or pp.millesime_apres = p_millesime)
   order by pp.millesime_apres desc limit 1;
  mil := coalesce(p_millesime, prm.millesime_apres);
  couv := case when prm.ville is null then null else jsonb_build_object(
    'ville', prm.ville, 'nom', prm.nom, 'millesime', prm.millesime_apres, 'role_libelle', prm.role_libelle,
    'apercu', coalesce(prm.apercu, false), 'note', prm.note) end;

  select count(*) into n_exact from public.unites x
   where x.ville = cible and x.rue_norm = d.rue_norm and x.civique_debut = d.civique_debut;
  if n_exact > 0 then
    n_unites := n_exact;
  else
    select count(*) into n_chev from public.unites x
     where x.ville = cible and x.rue_norm = d.rue_norm
       and x.civique_debut <= d.civique_fin and x.civique_fin >= d.civique_debut;
    n_unites := n_chev;
  end if;

  u := public.unite_apparier(adresse, cible);
  if u.id_uev is null then
    select v.civique_min, v.civique_max into lo, hi from public.voies v where v.ville = cible and v.rue_norm = d.rue_norm;
    if not found then
      select coalesce(jsonb_agg(rue order by sim desc), '[]'::jsonb) into voies
      from (select rue, extensions.similarity(rue_norm, d.rue_norm) as sim
            from public.voies v where v.ville = cible and v.rue_norm % d.rue_norm
            order by sim desc limit 6) s;
      return jsonb_build_object('trouve', false, 'categorie', 'introuvable', 'couverture', couv,
        'diagnostic', jsonb_build_object('cas', 'voie_inconnue', 'voie', d.rue_norm,
                                         'voies_proches', voies));
    end if;
    if d.civique_debut < lo or d.civique_debut > hi then
      return jsonb_build_object('trouve', false, 'categorie', 'introuvable', 'couverture', couv,
        'diagnostic', jsonb_build_object('cas', 'hors_plage', 'voie', d.rue_norm,
                                         'plage', jsonb_build_array(lo, hi)));
    end if;
    select coalesce(jsonb_agg(civique_debut || ' ' || rue order by dist), '[]'::jsonb)
      into voisins
    from (select civique_debut, regexp_replace(min(rue), '\s*\([^)]*\)\s*$', '') as rue,
                 abs(civique_debut - d.civique_debut) as dist
          from public.unites x where x.ville = cible and x.rue_norm = d.rue_norm
          group by x.civique_debut order by dist limit 6) s;
    return jsonb_build_object('trouve', false, 'categorie', 'introuvable', 'couverture', couv,
      'diagnostic', jsonb_build_object('cas', 'numero_absent', 'voie', d.rue_norm,
                                       'plage', jsonb_build_array(lo, hi), 'voisins', voisins));
  end if;

  -- Adresse de l'immeuble sans appartement, et l'appartement de l'unité quand il
  -- la désigne sans ambiguïté (unité seule à l'adresse, ou numéro fourni et trouvé).
  adresse_base := u.civique_debut ||
      case when u.civique_fin <> u.civique_debut then ' - ' || u.civique_fin else '' end ||
      ' ' || regexp_replace(u.rue, '\s*\([^)]*\)\s*$', '');
  app_aff := case when n_unites = 1 then public.appartement_normaliser(u.appartement)
                  when d.appartement is not null
                       and public.appartement_normaliser(u.appartement) = d.appartement then d.appartement end;
  r := jsonb_build_object('trouve', true, 'matricule', u.matricule, 'couverture', couv,
    'unite', jsonb_build_object('ville', u.ville,
      'adresse', adresse_base || case when app_aff is not null then ', app. ' || app_aff else '' end,
      'adresse_base', adresse_base, 'appartement', app_aff,
      'logements', u.logements, 'categorie', u.categorie, 'utilisation', u.utilisation,
      'annee_construction', u.annee_construction, 'etages', u.etages,
      'division', left(u.matricule, 4)));

  if n_unites > 1 then
    -- Copropriété : les numéros d'appartement présents à l'adresse (même
    -- ensemble de candidats que n_unites), l'exemple = le plus petit, et les
    -- plus proches du numéro demandé. Même ordre que le moteur
    -- (opendata.appartements_proches).
    with cand as (
      select distinct public.appartement_normaliser(x.appartement) as app,
             substring(public.appartement_normaliser(x.appartement) from '^\d+')::bigint as num
      from public.unites x
      where x.ville = cible and x.rue_norm = d.rue_norm
        and x.appartement is not null
        and ((n_exact > 0 and x.civique_debut = d.civique_debut)
             or (n_exact = 0 and x.civique_debut <= d.civique_fin and x.civique_fin >= d.civique_debut)))
    select (select count(*) from public.unites x
             where x.ville = cible and x.rue_norm = d.rue_norm and x.appartement is not null
               and ((n_exact > 0 and x.civique_debut = d.civique_debut)
                    or (n_exact = 0 and x.civique_debut <= d.civique_fin and x.civique_fin >= d.civique_debut))),
           (select app from cand order by (num is null), num, app limit 1),
           (select coalesce(jsonb_agg(app order by ord), '[]'::jsonb) from
              (select app, row_number() over (order by (num is null),
                        abs(num - substring(d.appartement from '^\d+')::bigint), app) as ord
               from cand) t where ord <= 6)
      into n_app, app_ex, apps;
    if d.appartement is null then
      return r || jsonb_build_object('trouve', false, 'categorie', 'adresse_partagee',
        'n_unites', n_unites, 'avec_appartements', n_app, 'appartement_exemple', app_ex);
    elsif app_aff is null then
      return r || jsonb_build_object('trouve', false, 'categorie', 'appartement_inconnu',
        'n_unites', n_unites, 'avec_appartements', n_app, 'appartement', d.appartement,
        'appartements_proches', apps);
    end if;
  end if;

  select * into p from public.pretri t
   where t.ville = cible and t.millesime_apres = mil and t.matricule = u.matricule;
  if not found then
    return r || jsonb_build_object('categorie', 'hors_champ');
  end if;

  e := p.ecart_sigma;
  grp := null;
  taux := null;
  frais := null;
  select * into fr from public.frais_revision f
   where f.ville = p.ville and p.valeur_apres > f.borne_inf and (f.borne_sup is null or p.valeur_apres <= f.borne_sup)
   order by f.annee desc limit 1;
  if found then
    frais := jsonb_build_object('frais', fr.frais, 'annee', fr.annee, 'nom', fr.nom, 'remboursement', fr.remboursement,
      'source_libelle', fr.source_libelle, 'source_url', fr.source_url);
  end if;
  select * into tx from public.taux_taxation x
   where x.ville = p.ville and x.arrondissement = coalesce(p.arrondissement, '') order by x.annee desc limit 1;
  if not found then
    select * into tx from public.taux_taxation x where x.ville = p.ville and x.arrondissement = '' order by x.annee desc limit 1;
  end if;
  if found then
    taux := jsonb_build_object('annee', tx.annee, 'taux_pct', tx.taux_pct, 'libelle', tx.nom,
      'niveau', case when tx.arrondissement = '' then 'municipalite' else 'arrondissement' end,
      'source_libelle', tx.source_libelle, 'source_url', tx.source_url);
  end if;

  if e is not null and p.rayon_m is not null and p.lat is not null then
    -- Bâtiments comparables par distance : même règle et même projection que
    -- le moteur (plan équirectangulaire à la latitude moyenne de la ville).
    select pp.lat0 into lat0 from public.pretri_parametres pp
     where pp.ville = p.ville and pp.millesime_apres = p.millesime_apres;
    lat0 := coalesce(lat0, p.lat);
    dlat := p.rayon_m / 111320.0 * 1.001;
    dlon := p.rayon_m / (111320.0 * cos(radians(lat0))) * 1.001;
    with c as (
      select t.matricule, t.hausse_pct, t.aire_etages_m2, t.logements
      from public.pretri t
      where t.ville = p.ville and t.millesime_apres = p.millesime_apres
        and t.matricule <> p.matricule and not t.batiment_modifie
        and t.lat between p.lat - dlat and p.lat + dlat
        and t.lon between p.lon - dlon and p.lon + dlon
        and t.classe is not distinct from p.classe
        and abs(t.logements - p.logements) <= 1
        and t.aire_etages_m2 between 0.8 * p.aire_etages_m2 and 1.2 * p.aire_etages_m2
        and sqrt(power((t.lat - p.lat) * 111320, 2) + power((t.lon - p.lon) * 111320 * cos(radians(lat0)), 2)) <= p.rayon_m)
    select jsonb_build_object(
      'niveau', p.comparaison, 'rayon_m', p.rayon_m, 'division', p.division,
      'classe', p.classe,
      'logements', p.logements, 'aire_sujet_m2', round(p.aire_etages_m2),
      'n', p.secteur_n, 'n_reconstitue', count(*),
      'etages', jsonb_build_array(min(x.etages), max(x.etages)),
      'annees', jsonb_build_array(min(x.annee_construction) filter (where x.annee_construction between 1600 and 2100),
                                  max(x.annee_construction) filter (where x.annee_construction between 1600 and 2100)),
      'aire_m2', jsonb_build_array(round(min(c.aire_etages_m2)), round(max(c.aire_etages_m2))),
      'etendue_m', p.rayon_m,
      'rues', (select coalesce(jsonb_agg(rue order by n desc), '[]'::jsonb)
               from (select regexp_replace(min(y.rue), '\s*\([^)]*\)\s*$', '') as rue, count(distinct c2.matricule) as n
                     from c c2 join public.unites y on y.matricule = c2.matricule
                     group by y.rue_norm order by n desc limit 5) rr),
      'histogramme', jsonb_build_object('de', -4, 'a', 4, 'pas', 0.25,
        'comptes', (select jsonb_agg(coalesce(k.n, 0) order by b.i)
                    from generate_series(1, 32) as b(i)
                    left join (select width_bucket((c3.hausse_pct - p.secteur_mediane) / p.secteur_ecart_type, -4, 4, 32) as kk, count(*) as n
                               from c c3 group by 1) k on k.kk = b.i),
        'sous', (select count(*) from c c4 where (c4.hausse_pct - p.secteur_mediane) / p.secteur_ecart_type < -4),
        'sur',  (select count(*) from c c5 where (c5.hausse_pct - p.secteur_mediane) / p.secteur_ecart_type >= 4)))
      into grp
    from c left join lateral (select y.etages, y.annee_construction from public.unites y
                              where y.matricule = c.matricule order by y.id_uev limit 1) x on true;

  elsif e is not null and p.comparaison in ('cellule et logements', 'cellule') then
    -- Ancienne maille (villes sans coordonnées)
    select jsonb_build_object(
      'niveau', p.comparaison, 'rayon_m', null, 'division', p.division, 'classe', null,
      'logements', case when p.comparaison = 'cellule et logements' then p.logements end,
      'aire_sujet_m2', round(p.aire_etages_m2),
      'n', count(distinct t.matricule),
      'etages', jsonb_build_array(min(x.etages), max(x.etages)),
      'annees', jsonb_build_array(min(x.annee_construction) filter (where x.annee_construction between 1600 and 2100),
                                  max(x.annee_construction) filter (where x.annee_construction between 1600 and 2100)),
      'aire_m2', jsonb_build_array(round(min(t.aire_etages_m2)), round(max(t.aire_etages_m2))),
      'etendue_m', 1000, 'rues', '[]'::jsonb, 'histogramme', null)
      into grp
    from public.pretri t join public.unites x on x.matricule = t.matricule
    where t.ville = p.ville and t.millesime_apres = p.millesime_apres
      and t.division = p.division and not t.batiment_modifie
      and (p.comparaison <> 'cellule et logements' or t.logements = p.logements);
  end if;

  cat := case when p.batiment_modifie then 'batiment_modifie'
              when e is null          then 'indeterminable'
              when e <= -1            then 'avantageux'
              when e <  1             then 'conforme'
              when e >= 3             then 'hors_proportions'
              when e >= 2             then 'solide'
              else                         'defendable' end;
  return r || jsonb_build_object('categorie', cat,
    'rapport_recommande', cat in ('defendable','solide','hors_proportions'),
    'groupe', grp,
    'pretri', jsonb_build_object('role_libelle', p.role_libelle,
      'valeur_precedente', p.valeur_avant, 'valeur_proposee', p.valeur_apres,
      'hausse_pct', p.hausse_pct, 'secteur_mediane_pct', p.secteur_mediane,
      'ecart_sigma', e, 'centile', p.centile, 'n_comparables', p.secteur_n,
      'comparaison', p.comparaison, 'rayon_m', p.rayon_m, 'batiment_modifie', p.batiment_modifie,
      'classe', p.classe, 'sigma_plancher', coalesce(p.sigma_plancher, false),
      'arrondissement', p.arrondissement, 'taux', taux, 'frais', frais));
end $$;

revoke execute on function public.appartement_normaliser(text), public.adresse_decouper(text),
  public.unite_apparier(text, text), public.unite_apparier(text),
  public.pretri_chercher(text, text, smallint) from public, anon, authenticated;
grant execute on function public.appartement_normaliser(text), public.adresse_decouper(text),
  public.unite_apparier(text, text), public.unite_apparier(text),
  public.pretri_chercher(text, text, smallint) to service_role;
