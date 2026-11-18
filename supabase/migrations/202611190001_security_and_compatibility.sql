-- Masar Al-Tamayuz security and compatibility migration
-- Review against the supplied Supabase audit CSV before applying.
-- Non-destructive: no tables, columns, policies, or content rows are dropped.

begin;

-- 1) Services need an explicit publication state (existing rows remain public).
alter table public.services
  add column if not exists is_published boolean not null default true;

-- 2) Supply generated IDs for tables where the audited schema has NOT NULL IDs
-- but no default. Existing primary keys and rows are preserved.
create sequence if not exists public.offers_id_seq;
select setval('public.offers_id_seq',
              greatest(coalesce((select max(id) from public.offers), 0) + 1, 1),
              false);
alter sequence public.offers_id_seq owned by public.offers.id;
alter table public.offers alter column id set default nextval('public.offers_id_seq');

create sequence if not exists public.services_id_seq;
select setval('public.services_id_seq',
              greatest(coalesce((select max(id) from public.services), 0) + 1, 1),
              false);
alter sequence public.services_id_seq owned by public.services.id;
alter table public.services alter column id set default nextval('public.services_id_seq');

create sequence if not exists public.portfolio_items_id_seq;
select setval('public.portfolio_items_id_seq',
              greatest(coalesce((select max(id) from public.portfolio_items), 0) + 1, 1),
              false);
alter sequence public.portfolio_items_id_seq owned by public.portfolio_items.id;
alter table public.portfolio_items alter column id set default nextval('public.portfolio_items_id_seq');

create sequence if not exists public.site_headings_config_id_seq;
select setval('public.site_headings_config_id_seq',
              greatest(coalesce((select max(id) from public.site_headings_config), 0) + 1, 1),
              false);
alter sequence public.site_headings_config_id_seq owned by public.site_headings_config.id;
alter table public.site_headings_config alter column id set default nextval('public.site_headings_config_id_seq');

grant usage, select on sequence public.offers_id_seq,
  public.services_id_seq, public.portfolio_items_id_seq,
  public.site_headings_config_id_seq to authenticated;

-- 3) Keep public SELECT only on tables needed to render the public site.
-- RLS remains the row-level authority; grants below are the SQL privilege layer.
revoke all privileges on table public.admin_users, public.offers,
  public.services, public.portfolio_items, public.platform_settings,
  public.site_headings_config, public.site_state, public.test_table
  from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.offers, public.services, public.portfolio_items,
  public.platform_settings, public.site_headings_config
  from anon;

grant select on table public.offers, public.services, public.portfolio_items,
  public.platform_settings, public.site_headings_config to anon;

-- Authenticated users may reach CRUD endpoints, but RLS policies below restrict
-- content mutations to authenticated site administrators.
grant select, insert, update, delete
  on table public.offers, public.services, public.portfolio_items,
  public.platform_settings, public.site_headings_config to authenticated;
grant select on table public.admin_users to authenticated;

-- 4) Published-only public row policies; admin policies remain authenticated-only.
drop policy if exists public_read on public.services;
create policy public_read on public.services
  for select to anon, authenticated using (is_published = true);
drop policy if exists admin_select on public.services;
create policy admin_select on public.services
  for select to authenticated using (public.is_site_admin());

drop policy if exists public_read on public.offers;
create policy public_read on public.offers
  for select to anon, authenticated using (is_published = true);

drop policy if exists public_read on public.portfolio_items;
create policy public_read on public.portfolio_items
  for select to anon, authenticated using (is_published = true);

-- The following tables contain public-facing configuration text/settings only.
-- No anonymous write grant or write policy is provided.
drop policy if exists public_read on public.platform_settings;
create policy public_read on public.platform_settings
  for select to anon, authenticated using (true);

drop policy if exists public_read on public.site_headings_config;
create policy public_read on public.site_headings_config
  for select to anon, authenticated using (true);

-- 4b) Partial indexes support the published-only public queries.
create index if not exists services_published_id_idx
  on public.services (id) where is_published = true;
create index if not exists offers_published_id_idx
  on public.offers (id desc) where is_published = true;
create index if not exists portfolio_published_id_idx
  on public.portfolio_items (id desc) where is_published = true;

-- 5) Remove the unused test table from all API roles and turn RLS on.
-- It is intentionally retained (not dropped) until its ownership/use is verified.
alter table public.test_table enable row level security;
revoke all privileges on table public.test_table from anon, authenticated;

-- 6) The admin predicate has an empty search_path and uses auth.uid().
-- Limit direct invocation to authenticated sessions; policies call it there.
revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

-- 7) Storage: preserve bucket visibility/limits from the audit.
-- masar-media remains public for image delivery; private-media remains private.
-- The only anonymous object policy is read-only on masar-media.
revoke all on table storage.objects from anon;
grant select on table storage.objects to anon;
drop policy if exists masar_media_public_read on storage.objects;
create policy masar_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'masar-media');

-- The public bucket is used only for images by the current uploader.
-- Keep video/PDF uploads in the private bucket so they cannot become public
-- merely because an admin chose the wrong bucket.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where id = 'masar-media';

commit;

-- Expected bucket settings (already observed in the supplied audit):
-- masar-media: public=true, 100 MiB, image/jpeg,image/png,image/webp,image/gif
-- plus current listed video/pdf MIME values; policy is public SELECT only.
-- masar-private-media: public=false, 100 MiB, video/mp4,video/webm,application/pdf.
-- Do not increase limits unless the Supabase project-level limit is also raised.
