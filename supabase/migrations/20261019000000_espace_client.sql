-- Espace client et formulaire de contact, premier volet (2026-10-17).
-- Décision de Guillaume : les clients payants ont un compte. Le pré-tri reste
-- sans compte ; « Ouvrir un dossier » mène à l'inscription (Supabase Auth,
-- courriel + mot de passe), puis au tableau de bord.
--   profils          : un par compte (créé par déclencheur), rôle client ou admin
--   dossiers         : un immeuble analysé pour un client ; statut suivi par l'admin
--   dossier_ventes   : ventes comparables fournies par le client (collées)
--   messages_contact : formulaire « Nous joindre », écrit par le serveur seulement
--   seau « rapports »: PDF déposés par l'admin, lus par le propriétaire du dossier
-- Tout passe par Row Level Security avec la clé anonyme et la session de
-- l'usager ; la clé de service ne sert qu'au formulaire de contact.
-- Appliqué à la main le 2026-10-17. Idempotent.

-- ------------------------------------------------------------- profils
create table if not exists public.profils (
  id        uuid primary key references auth.users(id) on delete cascade,
  courriel  text,
  nom       text,
  telephone text,
  role      text not null default 'client' check (role in ('client', 'admin')),
  cree_le   timestamptz not null default now()
);
comment on table public.profils is 'Un profil par compte Supabase Auth ; créé par déclencheur à l''inscription. role = admin pour Contest-Taxes.';
alter table public.profils enable row level security;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profils p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke execute on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated, service_role;

drop policy if exists profils_lire on public.profils;
create policy profils_lire on public.profils for select to authenticated
  using (id = auth.uid() or public.est_admin());
drop policy if exists profils_modifier on public.profils;
create policy profils_modifier on public.profils for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.profils from anon, authenticated;
grant select on public.profils to authenticated;
grant update (nom, telephone) on public.profils to authenticated;

create or replace function public.profil_creer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, courriel) values (new.id, new.email)
  on conflict (id) do update set courriel = excluded.courriel;
  return new;
end $$;
drop trigger if exists profil_creer on auth.users;
create trigger profil_creer after insert on auth.users
  for each row execute function public.profil_creer();
-- comptes créés avant le déclencheur
insert into public.profils (id, courriel) select id, email from auth.users on conflict (id) do nothing;

-- ------------------------------------------------------------- dossiers
create table if not exists public.dossiers (
  id                uuid primary key default gen_random_uuid(),
  proprietaire      uuid not null default auth.uid() references public.profils(id) on delete cascade,
  ville             text,                 -- code géographique MAMH (66023, 81017…)
  matricule         text,
  adresse           text not null,
  unite             jsonb,                -- instantané du pré-tri : immeuble, chiffres, catégorie, couverture
  statut            text not null default 'nouveau'
                    check (statut in ('nouveau', 'ventes_recues', 'en_analyse', 'rapport_disponible', 'ferme')),
  notes_client      text,
  rapport_chemin    text,                 -- objet du seau « rapports » : {proprietaire}/{dossier}/analyse.pdf
  rapport_depose_le timestamptz,
  cree_le           timestamptz not null default now(),
  maj_le            timestamptz not null default now()
);
comment on table public.dossiers is 'Un dossier = un immeuble analysé pour un client. Le client crée le dossier et fournit ses ventes ; Contest-Taxes change le statut et dépose le rapport.';
create index if not exists dossiers_proprietaire_idx on public.dossiers (proprietaire, cree_le desc);
alter table public.dossiers enable row level security;

drop policy if exists dossiers_lire on public.dossiers;
create policy dossiers_lire on public.dossiers for select to authenticated
  using (proprietaire = auth.uid() or public.est_admin());
drop policy if exists dossiers_creer on public.dossiers;
create policy dossiers_creer on public.dossiers for insert to authenticated
  with check (proprietaire = auth.uid());
drop policy if exists dossiers_modifier on public.dossiers;
create policy dossiers_modifier on public.dossiers for update to authenticated
  using (proprietaire = auth.uid() or public.est_admin())
  with check (proprietaire = auth.uid() or public.est_admin());
revoke all on public.dossiers from anon, authenticated;
grant select, insert, update on public.dossiers to authenticated;

-- Le client ne touche qu'à ses notes ; statut, rapport et identité de l'immeuble
-- sont réservés à l'admin, sauf le passage automatique nouveau → ventes_recues.
create or replace function public.dossier_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.maj_le := now();
  if public.est_admin() then
    return new;
  end if;
  if new.proprietaire <> old.proprietaire or new.ville is distinct from old.ville
     or new.matricule is distinct from old.matricule or new.adresse <> old.adresse
     or new.unite is distinct from old.unite or new.rapport_chemin is distinct from old.rapport_chemin
     or new.rapport_depose_le is distinct from old.rapport_depose_le
     or (new.statut <> old.statut and not (old.statut = 'nouveau' and new.statut = 'ventes_recues')) then
    raise exception 'champ réservé à Contest-Taxes' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists dossier_proteger on public.dossiers;
create trigger dossier_proteger before update on public.dossiers
  for each row execute function public.dossier_proteger();

-- ------------------------------------------------------------- ventes fournies
create table if not exists public.dossier_ventes (
  id          bigserial primary key,
  dossier_id  uuid not null references public.dossiers(id) on delete cascade,
  adresse     text not null,
  date_vente  date,
  prix        numeric,
  cree_le     timestamptz not null default now()
);
create index if not exists dossier_ventes_dossier_idx on public.dossier_ventes (dossier_id);
alter table public.dossier_ventes enable row level security;
drop policy if exists ventes_lire on public.dossier_ventes;
create policy ventes_lire on public.dossier_ventes for select to authenticated
  using (exists (select 1 from public.dossiers d where d.id = dossier_id and (d.proprietaire = auth.uid() or public.est_admin())));
drop policy if exists ventes_ajouter on public.dossier_ventes;
create policy ventes_ajouter on public.dossier_ventes for insert to authenticated
  with check (exists (select 1 from public.dossiers d where d.id = dossier_id and (d.proprietaire = auth.uid() or public.est_admin())));
drop policy if exists ventes_retirer on public.dossier_ventes;
create policy ventes_retirer on public.dossier_ventes for delete to authenticated
  using (exists (select 1 from public.dossiers d where d.id = dossier_id and (d.proprietaire = auth.uid() or public.est_admin())));
revoke all on public.dossier_ventes from anon, authenticated;
grant select, insert, delete on public.dossier_ventes to authenticated;
grant usage, select on sequence public.dossier_ventes_id_seq to authenticated;

-- Première vente reçue : le dossier passe de « nouveau » à « ventes reçues ».
create or replace function public.dossier_ventes_recues() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.dossiers set statut = 'ventes_recues' where id = new.dossier_id and statut = 'nouveau';
  return new;
end $$;
drop trigger if exists dossier_ventes_recues on public.dossier_ventes;
create trigger dossier_ventes_recues after insert on public.dossier_ventes
  for each row execute function public.dossier_ventes_recues();

-- ------------------------------------------------------------- messages de contact
create table if not exists public.messages_contact (
  id        bigserial primary key,
  cree_le   timestamptz not null default now(),
  nom       text not null,
  courriel  text not null,
  adresse   text,
  message   text not null,
  ip_hash   text,
  traite    boolean not null default false
);
comment on table public.messages_contact is 'Formulaire « Nous joindre » : écrit par le serveur (clé de service) via contact_enregistrer ; lu et marqué traité par l''admin.';
alter table public.messages_contact enable row level security;
drop policy if exists messages_lire on public.messages_contact;
create policy messages_lire on public.messages_contact for select to authenticated using (public.est_admin());
drop policy if exists messages_traiter on public.messages_contact;
create policy messages_traiter on public.messages_contact for update to authenticated
  using (public.est_admin()) with check (public.est_admin());
revoke all on public.messages_contact from anon, authenticated;
grant select on public.messages_contact to authenticated;
grant update (traite) on public.messages_contact to authenticated;

-- Enregistrement avec limite par connexion : 5 messages par heure, 20 par jour.
create or replace function public.contact_enregistrer(p_nom text, p_courriel text, p_adresse text,
                                                      p_message text, p_ip_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n_heure integer; n_jour integer; nouvel_id bigint;
begin
  select count(*) filter (where cree_le > now() - interval '1 hour'),
         count(*) filter (where cree_le > now() - interval '1 day')
    into n_heure, n_jour
    from public.messages_contact where ip_hash = p_ip_hash;
  if n_heure >= 5 or n_jour >= 20 then
    return jsonb_build_object('ok', false, 'motif', 'limite');
  end if;
  insert into public.messages_contact (nom, courriel, adresse, message, ip_hash)
    values (p_nom, p_courriel, nullif(p_adresse, ''), p_message, p_ip_hash)
    returning id into nouvel_id;
  return jsonb_build_object('ok', true, 'id', nouvel_id);
end $$;
revoke execute on function public.contact_enregistrer(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.contact_enregistrer(text, text, text, text, text) to service_role;

-- ------------------------------------------------------------- seau des rapports
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('rapports', 'rapports', false, 20971520, array['application/pdf'])
  on conflict (id) do nothing;
drop policy if exists rapports_lire on storage.objects;
create policy rapports_lire on storage.objects for select to authenticated
  using (bucket_id = 'rapports' and (split_part(name, '/', 1) = auth.uid()::text or public.est_admin()));
drop policy if exists rapports_deposer on storage.objects;
create policy rapports_deposer on storage.objects for insert to authenticated
  with check (bucket_id = 'rapports' and public.est_admin());
drop policy if exists rapports_remplacer on storage.objects;
create policy rapports_remplacer on storage.objects for update to authenticated
  using (bucket_id = 'rapports' and public.est_admin()) with check (bucket_id = 'rapports' and public.est_admin());
drop policy if exists rapports_supprimer on storage.objects;
create policy rapports_supprimer on storage.objects for delete to authenticated
  using (bucket_id = 'rapports' and public.est_admin());
