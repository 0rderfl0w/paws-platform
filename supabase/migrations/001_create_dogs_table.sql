-- Dogs table
create table if not exists public.dogs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  size text not null check (size in ('small', 'medium', 'large')),
  age text,
  description text,
  photo_url text,
  is_adopted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.dogs enable row level security;

-- Public can read all non-adopted dogs
create policy "Public can view dogs" on public.dogs
  for select using (true);

-- Authenticated users can manage dogs
create policy "Authenticated users can insert dogs" on public.dogs
  for insert to authenticated with check (true);

create policy "Authenticated users can update dogs" on public.dogs
  for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete dogs" on public.dogs
  for delete to authenticated using (true);

-- Storage bucket for dog photos
insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', true)
on conflict do nothing;

-- Public read access to dog photos
create policy "Public can view dog photos" on storage.objects
  for select using (bucket_id = 'dog-photos');

-- Authenticated users can upload/delete dog photos
create policy "Authenticated users can upload dog photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'dog-photos');

create policy "Authenticated users can delete dog photos" on storage.objects
  for delete to authenticated using (bucket_id = 'dog-photos');
