-- Pré-tri Contest-Taxes, huitième volet : frais de dépôt d'une demande de révision.
-- Demande de Guillaume (2026-10-15) : dire ce que coûte l'ouverture d'une demande
-- de révision dans la ville, pour un immeuble de cette valeur, et le rapporter
-- au coût annuel d'un point de hausse. Barèmes par tranche de valeur inscrite
-- au rôle (art. 263.2 LFM) : Montréal 2026 (montreal.ca), Gatineau (règlement
-- 943-2023). Table chargée par sql/charger_frais.sql du moteur.
-- Appliqué à la main le 2026-10-15. Idempotent.

create table if not exists public.frais_revision (
  ville           text     not null,
  annee           smallint not null,
  borne_inf       numeric  not null default 0,   -- valeur inscrite au rôle strictement supérieure à…
  borne_sup       numeric,                       -- … et inférieure ou égale à (nul : sans plafond)
  frais           numeric  not null,
  nom             text,
  remboursement   text,                          -- phrase affichée : non remboursable, ou conditions
  source_libelle  text,
  source_url      text,
  primary key (ville, annee, borne_inf)
);
alter table public.frais_revision add column if not exists remboursement text;
comment on table public.frais_revision is 'Somme exigée au dépôt d''une demande de révision, par ville et tranche de valeur inscrite au rôle. Source : contestaxes/donnees/frais_revision.csv.';
alter table public.frais_revision enable row level security;
revoke all on public.frais_revision from anon, authenticated;

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

  r := jsonb_build_object('trouve', true, 'matricule', u.matricule, 'couverture', couv,
    'unite', jsonb_build_object('ville', u.ville, 'adresse', u.civique_debut ||
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

revoke execute on function public.pretri_chercher(text, text, smallint) from public, anon, authenticated;
grant execute on function public.pretri_chercher(text, text, smallint) to service_role;
