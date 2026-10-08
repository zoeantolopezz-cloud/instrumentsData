-- Esquema inicial para InstrumentsData.
-- Estas políticas permiten escritura pública sin iniciar sesión: son prácticas para
-- una primera prueba, pero deben endurecerse si la aplicación almacena datos sensibles.

create table if not exists public.instruments (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  instrument_name text not null,
  part_number text not null,
  serial_number text not null,
  photo_url text not null,
  photo_path text not null,
  created_at timestamptz not null default now()
);

alter table public.instruments enable row level security;
grant select, insert, delete on public.instruments to anon, authenticated;

drop policy if exists "Public can read instruments" on public.instruments;
create policy "Public can read instruments"
  on public.instruments for select to anon, authenticated using (true);

drop policy if exists "Public can add instruments" on public.instruments;
create policy "Public can add instruments"
  on public.instruments for insert to anon, authenticated with check (true);

drop policy if exists "Public can delete instruments" on public.instruments;
create policy "Public can delete instruments"
  on public.instruments for delete to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('instruments-photos', 'instruments-photos', true, 8388608, array['image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant select, insert, delete on storage.objects to anon, authenticated;

drop policy if exists "Public can view instrument photos" on storage.objects;
create policy "Public can view instrument photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'instruments-photos');

drop policy if exists "Public can upload instrument photos" on storage.objects;
create policy "Public can upload instrument photos"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'instruments-photos');

drop policy if exists "Public can delete instrument photos" on storage.objects;
create policy "Public can delete instrument photos"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'instruments-photos');
