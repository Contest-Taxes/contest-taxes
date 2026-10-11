-- Pré-tri Contest-Taxes, troisième volet : bâtiments comparables par distance.
-- Définition adoptée le 2026-10-11 : à moins de 500 m, ±1 logement, aire ±20 % ;
-- repli à 1 km, puis 5 km dans les petites municipalités (calculé par le
-- moteur, contestaxes.pretri.construire_table). La table reçoit le rayon
-- retenu et les coordonnées ; la description du groupe et l'histogramme se
-- calculent désormais par distance. Les villes sans coordonnées gardent
-- l'ancienne maille (cellule cadastrale) : les deux branches sont conservées.
-- Appliqué à la main le 2026-10-11. Idempotent.

alter table public.pretri
  add column if not exists rayon_m integer,
  add column if not exists lat double precision,
  add column if not exists lon double precision;
comment on column public.pretri.rayon_m is 'Rayon (m) dans lequel les comparables ont été pris : 500, 1000 ou 5000 ; nul si comparaison insuffisante ou maille par cellule.';
create index if not exists pretri_lat_idx on public.pretri (ville, millesime_apres, lat);

-- Paramètres par table chargée : latitude moyenne (projection des distances,
-- la même que celle du moteur). Rempli par le script de chargement.
create table if not exists public.pretri_parametres (
  ville text not null, millesime_apres smallint not null,
  lat0 double precision, immeubles integer,
  primary key (ville, millesime_apres)
);
alter table public.pretri_parametres enable row level security;
revoke all on public.pretri_parametres from anon, authenticated;
insert into public.pretri_parametres (ville, millesime_apres, lat0, immeubles)
select ville, millesime_apres, avg(lat), count(*) from public.pretri group by 1, 2
on conflict (ville, millesime_apres) do update set lat0 = excluded.lat0, immeubles = excluded.immeubles;

create or replace function public.pretri_chercher(adresse text,
                                                  ville text default '66023',
                                                  millesime smallint default 2026)
returns jsonb language plpgsql stable as $$
declare
  d record; u public.unites; p public.pretri; r jsonb; e double precision;
  cat text; voies jsonb; voisins jsonb; lo integer; hi integer;
  n_exact integer; n_chev integer; n_unites integer; grp jsonb;
  dlat double precision; dlon double precision; lat0 double precision;
begin
  select * into d from public.adresse_decouper(adresse);
  if d.rue_norm = '' or d.civique_debut is null then
    return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
      'diagnostic', jsonb_build_object('cas', 'format'));
  end if;

  select count(*) into n_exact from public.unites x
   where x.rue_norm = d.rue_norm and x.civique_debut = d.civique_debut;
  if n_exact > 0 then
    n_unites := n_exact;
  else
    select count(*) into n_chev from public.unites x
     where x.rue_norm = d.rue_norm
       and x.civique_debut <= d.civique_fin and x.civique_fin >= d.civique_debut;
    n_unites := n_chev;
  end if;

  u := public.unite_apparier(adresse);
  if u.id_uev is null then
    select civique_min, civique_max into lo, hi from public.voies where rue_norm = d.rue_norm;
    if not found then
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
    select coalesce(jsonb_agg(civique_debut || ' ' || rue order by dist), '[]'::jsonb)
      into voisins
    from (select civique_debut, regexp_replace(min(rue), '\s*\([^)]*\)\s*$', '') as rue,
                 abs(civique_debut - d.civique_debut) as dist
          from public.unites where rue_norm = d.rue_norm
          group by civique_debut order by dist limit 6) s;
    return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
      'diagnostic', jsonb_build_object('cas', 'numero_absent', 'voie', d.rue_norm,
                                       'plage', jsonb_build_array(lo, hi), 'voisins', voisins));
  end if;

  r := jsonb_build_object('trouve', true, 'matricule', u.matricule,
    'unite', jsonb_build_object('adresse', u.civique_debut ||
        case when u.civique_fin <> u.civique_debut then ' - ' || u.civique_fin else '' end ||
        ' ' || regexp_replace(u.rue, '\s*\([^)]*\)\s*$', ''),
      'logements', u.logements, 'categorie', u.categorie, 'utilisation', u.utilisation,
      'annee_construction', u.annee_construction, 'etages', u.etages,
      'division', left(u.matricule, 4)));

  if n_unites > 1 then
    return r || jsonb_build_object('trouve', false, 'categorie', 'adresse_partagee',
      'n_unites', n_unites);
  end if;

  select * into p from public.pretri t
   where t.ville = pretri_chercher.ville and t.millesime_apres = millesime and t.matricule = u.matricule;
  if not found then
    return r || jsonb_build_object('categorie', 'hors_champ');
  end if;

  e := p.ecart_sigma;
  grp := null;

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
        and abs(t.logements - p.logements) <= 1
        and t.aire_etages_m2 between 0.8 * p.aire_etages_m2 and 1.2 * p.aire_etages_m2
        and sqrt(power((t.lat - p.lat) * 111320, 2) + power((t.lon - p.lon) * 111320 * cos(radians(lat0)), 2)) <= p.rayon_m)
    select jsonb_build_object(
      'niveau', p.comparaison, 'rayon_m', p.rayon_m, 'division', p.division,
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
      'niveau', p.comparaison, 'rayon_m', null, 'division', p.division,
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
      'comparaison', p.comparaison, 'rayon_m', p.rayon_m, 'batiment_modifie', p.batiment_modifie));
end $$;

revoke execute on function public.pretri_chercher(text, text, smallint) from public, anon, authenticated;
grant execute on function public.pretri_chercher(text, text, smallint) to service_role;
