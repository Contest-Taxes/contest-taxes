-- Rapports en deux langues et langue du client (2026-10-18).
-- Un dossier peut porter un rapport par langue (fr, en), déposé par l'admin ;
-- le client les télécharge sous un nom qui dit la langue :
-- « Fr-Rapport_Analyse_428-rue-Murphy_2026.pdf ». Le chemin dans le seau
-- « rapports » reste sous le dossier du propriétaire : {proprietaire}/{dossier}/{langue}/analyse.pdf.
-- Appliqué à la main le 2026-10-18. Idempotent.

alter table public.dossiers add column if not exists langue text not null default 'fr' check (langue in ('fr', 'en'));
comment on column public.dossiers.langue is 'Langue choisie par le client à l''ouverture du dossier (langue du site à ce moment).';

create table if not exists public.dossier_rapports (
  id           bigserial primary key,
  dossier_id   uuid not null references public.dossiers(id) on delete cascade,
  langue       text not null check (langue in ('fr', 'en')),
  chemin       text not null,          -- objet du seau « rapports »
  nom_fichier  text not null,          -- nom proposé au téléchargement
  annee        smallint,               -- millésime du rôle analysé
  depose_le    timestamptz not null default now(),
  unique (dossier_id, langue)
);
comment on table public.dossier_rapports is 'Rapports PDF d''un dossier, un par langue ; déposés par l''admin, lus par le propriétaire.';
alter table public.dossier_rapports enable row level security;
drop policy if exists rapports_lire on public.dossier_rapports;
create policy rapports_lire on public.dossier_rapports for select to authenticated
  using (exists (select 1 from public.dossiers d where d.id = dossier_id and (d.proprietaire = auth.uid() or public.est_admin())));
drop policy if exists rapports_gerer on public.dossier_rapports;
create policy rapports_gerer on public.dossier_rapports for all to authenticated
  using (public.est_admin()) with check (public.est_admin());
revoke all on public.dossier_rapports from anon, authenticated;
grant select, insert, update, delete on public.dossier_rapports to authenticated;
grant usage, select on sequence public.dossier_rapports_id_seq to authenticated;

-- Le dossier passe à « rapport disponible » dès qu'un rapport est déposé.
create or replace function public.dossier_rapport_depose() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.dossiers set rapport_chemin = new.chemin, rapport_depose_le = new.depose_le,
         statut = case when statut = 'ferme' then statut else 'rapport_disponible' end
   where id = new.dossier_id;
  return new;
end $$;
drop trigger if exists dossier_rapport_depose on public.dossier_rapports;
create trigger dossier_rapport_depose after insert or update on public.dossier_rapports
  for each row execute function public.dossier_rapport_depose();

-- Le dépôt d'un rapport par la clé de service (scripts) déclenche la mise à
-- jour du dossier : dossier_proteger doit laisser passer la clé de service et
-- les sessions SQL directes (auth.uid() nul), pas seulement l'admin connecté.
create or replace function public.dossier_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.maj_le := now();
  if public.est_admin() or auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if new.proprietaire <> old.proprietaire or new.ville is distinct from old.ville
     or new.matricule is distinct from old.matricule or new.adresse <> old.adresse
     or new.unite is distinct from old.unite or new.rapport_chemin is distinct from old.rapport_chemin
     or new.rapport_depose_le is distinct from old.rapport_depose_le
     or new.langue is distinct from old.langue
     or (new.statut <> old.statut and not (old.statut = 'nouveau' and new.statut = 'ventes_recues')) then
    raise exception 'champ réservé à Contest-Taxes' using errcode = '42501';
  end if;
  return new;
end $$;
