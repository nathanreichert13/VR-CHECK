-- VR-CHECK: estrutura do banco no Supabase
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode ser executado mais de uma vez sem problema.

-- 1) Tabela das vistorias em andamento.
--    Cada vistoria fica num único registro JSON (cabeçalho, cômodos, textos e referências das fotos).
--    Depois que o PDF é gerado e conferido, o sistema apaga o registro e as fotos.
create table if not exists public.vistorias (
  id            uuid primary key,
  dados         jsonb not null,
  criado_por    uuid references auth.users (id) on delete set null default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vistorias_atualizado_em_idx on public.vistorias (atualizado_em desc);

-- 2) Segurança: apenas usuários logados (equipe do escritório) acessam.
alter table public.vistorias enable row level security;

drop policy if exists "equipe acessa vistorias" on public.vistorias;
create policy "equipe acessa vistorias" on public.vistorias
  for all to authenticated
  using (true)
  with check (true);

-- 3) Bucket PRIVADO para as fotos (caminho: <id da vistoria>/<id da foto>.jpg).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "equipe le fotos" on storage.objects;
drop policy if exists "equipe envia fotos" on storage.objects;
drop policy if exists "equipe apaga fotos" on storage.objects;

create policy "equipe le fotos" on storage.objects
  for select to authenticated using (bucket_id = 'fotos');

create policy "equipe envia fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

create policy "equipe apaga fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');

-- 4) Histórico de vistorias concluídas (SEM fotos e sem textos dos cômodos).
--    Gravado quando a vistoria é apagada depois de gerar o laudo. Guarda endereço, Imb, contrato,
--    locatário(s) com CPF, vistoriador e datas, só para consulta. Cada registro ocupa poucos KB.
create table if not exists public.historico (
  id           uuid primary key,
  dados        jsonb not null,
  concluido_em timestamptz not null default now()
);

create index if not exists historico_concluido_em_idx on public.historico (concluido_em desc);

alter table public.historico enable row level security;

drop policy if exists "equipe acessa historico" on public.historico;
create policy "equipe acessa historico" on public.historico
  for all to authenticated
  using (true)
  with check (true);
