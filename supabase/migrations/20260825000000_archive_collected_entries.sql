alter table public.einlagerungen
  add column if not exists abgeholt_am timestamptz;

create index if not exists einlagerungen_aktive_ts_idx
  on public.einlagerungen (ts desc)
  where abgeholt_am is null;

create policy "anon update"
  on public.einlagerungen
  for update to anon
  using (true)
  with check (true);
