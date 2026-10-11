-- Pré-tri Contest-Taxes, second volet : ce qu'il faut pour exposer la fonction
-- au site. (1) Une adresse partagée par plusieurs unités (copropriétés) rend
-- « adresse_partagee » au lieu d'une unité choisie au hasard. (2) Journal des
-- requêtes et limite de débit tenus dans Postgres — pas de service externe.
-- (3) Droits d'exécution pour la clé de service, et pour elle seule.
-- Appliqué à la main le 2026-10-11. Idempotent.

-- ---------------------------------------------------------------
-- (1) pretri_chercher : détection des adresses partagées
-- ---------------------------------------------------------------
create or replace function public.pretri_chercher(adresse text,
                                                  ville text default '66023',
                                                  millesime smallint default 2026)
returns jsonb language plpgsql stable as $$
declare
  d record; u public.unites; p public.pretri; r jsonb; e double precision;
  cat text; voies jsonb; voisins jsonb; lo integer; hi integer;
  n_exact integer; n_chev integer; n_unites integer; grp jsonb;
begin
  select * into d from public.adresse_decouper(adresse);
  if d.rue_norm = '' or d.civique_debut is null then
    return jsonb_build_object('trouve', false, 'categorie', 'introuvable',
      'diagnostic', jsonb_build_object('cas', 'format'));
  end if;

  -- Combien d'unités répondent à cette adresse ? (même logique qu'unite_apparier :
  -- numéro exact d'abord, chevauchement de plage sinon)
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
    -- numéros distincts : une copropriété compte plusieurs unités au même numéro
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

  -- Plusieurs unités à la même adresse : impossible de savoir laquelle est
  -- celle du visiteur sans numéro d'appartement (champ absent de l'index).
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

  -- Le groupe de comparaison, décrit pour le visiteur : combien d'immeubles,
  -- où (étendue de la cellule, rues), et leurs plages d'étages, d'années de
  -- construction et d'aire. Même définition que dans construire_table :
  -- même division (et mêmes logements au niveau fin), bâtiments non modifiés.
  grp := null;
  if e is not null and p.comparaison in ('cellule et logements', 'cellule') then
    select jsonb_build_object(
      'niveau', p.comparaison, 'division', p.division,
      'logements', case when p.comparaison = 'cellule et logements' then p.logements end,
      'n', count(distinct t.matricule),
      'etages', jsonb_build_array(min(x.etages), max(x.etages)),
      -- 9999 = année inconnue au rôle
      'annees', jsonb_build_array(min(x.annee_construction) filter (where x.annee_construction between 1600 and 2100),
                                  max(x.annee_construction) filter (where x.annee_construction between 1600 and 2100)),
      'aire_m2', jsonb_build_array(round(min(t.aire_etages_m2)), round(max(t.aire_etages_m2))),
      'etendue_m', round(greatest((max(x.lat) - min(x.lat)) * 111320,
                                  (max(x.lon) - min(x.lon)) * 111320 * cos(radians(45.5))) / 100) * 100,
      -- Histogramme des hausses du groupe, en écarts-types autour de la médiane
      -- (mêmes médiane et dispersion que celles qui situent le sujet), pas de
      -- 0,25 σ de −4 à +4 ; 'sous' et 'sur' comptent ce qui déborde. Sert à
      -- superposer la distribution réelle à la courbe normale.
      'histogramme', (select jsonb_build_object('de', -4, 'a', 4, 'pas', 0.25,
                        'comptes', (select jsonb_agg(coalesce(c.n, 0) order by b.i)
                                    from generate_series(1, 32) as b(i)
                                    left join (select width_bucket((t3.hausse_pct - p.secteur_mediane) / p.secteur_ecart_type, -4, 4, 32) as k, count(*) as n
                                               from public.pretri t3
                                               where t3.ville = p.ville and t3.millesime_apres = p.millesime_apres
                                                 and t3.division = p.division and not t3.batiment_modifie
                                                 and (p.comparaison <> 'cellule et logements' or t3.logements = p.logements)
                                               group by 1) c on c.k = b.i),
                        'sous', (select count(*) from public.pretri t4
                                 where t4.ville = p.ville and t4.millesime_apres = p.millesime_apres
                                   and t4.division = p.division and not t4.batiment_modifie
                                   and (p.comparaison <> 'cellule et logements' or t4.logements = p.logements)
                                   and (t4.hausse_pct - p.secteur_mediane) / p.secteur_ecart_type < -4),
                        'sur', (select count(*) from public.pretri t5
                                where t5.ville = p.ville and t5.millesime_apres = p.millesime_apres
                                  and t5.division = p.division and not t5.batiment_modifie
                                  and (p.comparaison <> 'cellule et logements' or t5.logements = p.logements)
                                  and (t5.hausse_pct - p.secteur_mediane) / p.secteur_ecart_type >= 4))),
      'rues', (select coalesce(jsonb_agg(rue order by n desc), '[]'::jsonb)
               from (select regexp_replace(min(y.rue), '\s*\([^)]*\)\s*$', '') as rue,
                            count(distinct t2.matricule) as n
                     from public.pretri t2 join public.unites y on y.matricule = t2.matricule
                     where t2.ville = p.ville and t2.millesime_apres = p.millesime_apres
                       and t2.division = p.division and not t2.batiment_modifie
                       and (p.comparaison <> 'cellule et logements' or t2.logements = p.logements)
                     group by y.rue_norm order by n desc limit 5) r))
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
      'comparaison', p.comparaison, 'batiment_modifie', p.batiment_modifie));
end $$;

create index if not exists pretri_division_idx on public.pretri (ville, millesime_apres, division);

-- ---------------------------------------------------------------
-- (2) Journal des requêtes et limite de débit
-- ---------------------------------------------------------------
-- Aucune adresse n'est conservée : seulement l'empreinte de l'IP (salée côté
-- serveur), la catégorie du verdict et la cellule cadastrale, pour les
-- statistiques du §3 du plan (volumes, répartition des verdicts).
create table if not exists public.pretri_journal (
  id         bigserial primary key,
  cree_le    timestamptz not null default now(),
  ip_hash    text not null,
  categorie  text,
  division   text,
  trouve     boolean
);
create index if not exists pretri_journal_ip_idx on public.pretri_journal (ip_hash, cree_le desc);
alter table public.pretri_journal enable row level security;
revoke all on public.pretri_journal from anon, authenticated;

-- Compte les requêtes de l'empreinte dans l'heure et la journée écoulées, les
-- enregistre si la limite n'est pas atteinte. Purge opportuniste à 30 jours.
create or replace function public.pretri_journaliser(p_ip_hash text, p_categorie text,
                                                     p_division text, p_trouve boolean,
                                                     p_max_heure integer default 30,
                                                     p_max_jour integer default 120)
returns jsonb language plpgsql volatile as $$
declare n_h integer; n_j integer;
begin
  if random() < 0.01 then
    delete from public.pretri_journal where cree_le < now() - interval '30 days';
  end if;
  select count(*) filter (where cree_le > now() - interval '1 hour'),
         count(*) filter (where cree_le > now() - interval '1 day')
    into n_h, n_j
    from public.pretri_journal where ip_hash = p_ip_hash and cree_le > now() - interval '1 day';
  if n_h >= p_max_heure or n_j >= p_max_jour then
    return jsonb_build_object('autorise', false, 'n_heure', n_h, 'n_jour', n_j);
  end if;
  insert into public.pretri_journal (ip_hash, categorie, division, trouve)
  values (p_ip_hash, p_categorie, p_division, p_trouve);
  return jsonb_build_object('autorise', true, 'n_heure', n_h + 1, 'n_jour', n_j + 1);
end $$;

-- ---------------------------------------------------------------
-- (3) Droits : rien pour anon/authenticated, exécution pour la clé de service
-- ---------------------------------------------------------------
revoke execute on function public.pretri_chercher(text, text, smallint),
  public.pretri_journaliser(text, text, text, boolean, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rue_normaliser(text), public.adresse_decouper(text),
  public.unite_apparier(text), public.pretri_chercher(text, text, smallint),
  public.pretri_journaliser(text, text, text, boolean, integer, integer)
  to service_role;
