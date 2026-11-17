-- Panthu: Xadrez, Caça-palavras, convites para todos os jogos e aviso de "jogo em alta".
-- Rode UMA vez no Supabase (SQL Editor) DEPOIS de pontos-favoritos-lgpd.sql. Pode rodar de novo sem problemas.

-- 1. Novos jogos aceitos nas partidas e nos convites (o Blackjack sai do app, mas o histórico dele continua guardado)
alter table public.jogos_partidas drop constraint if exists jogos_partidas_jogo_check;
alter table public.jogos_partidas add constraint jogos_partidas_jogo_check
  check (jogo in ('blackjack', 'memoria', 'truco', 'paciencia', 'xadrez', 'cacapalavras'));
alter table public.jogos_convites drop constraint if exists jogos_convites_jogo_check;
alter table public.jogos_convites add constraint jogos_convites_jogo_check
  check (jogo in ('truco', 'memoria', 'xadrez', 'paciencia', 'cacapalavras'));

create or replace function public.convidar_para_jogar(p_para uuid, p_jogo text)
returns table (id uuid, sala text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare novo uuid; cod text;
begin
  if not public.usuario_liberado() then raise exception 'Não permitido'; end if;
  if p_jogo not in ('truco', 'memoria', 'xadrez', 'paciencia', 'cacapalavras') then raise exception 'Jogo inválido'; end if;
  if not exists (select 1 from public.pessoas_para_jogar() x where x.id = p_para) then
    raise exception 'Só dá para chamar amigos salvos ou pessoas com quem você já conversou.';
  end if;
  if (select count(*) from public.jogos_convites where de = auth.uid() and criado_em > now() - interval '1 day') >= 30 then
    raise exception 'Limite diário de convites atingido. Tente amanhã.';
  end if;
  update public.jogos_convites set status = 'cancelado', respondido_em = now() where de = auth.uid() and para = p_para and status = 'pendente';
  cod := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.jogos_convites (de, para, jogo, sala) values (auth.uid(), p_para, p_jogo, cod) returning jogos_convites.id into novo;
  return query select novo, cod;
end $$;

-- 2. Quem está jogando agora e o aviso automático de "jogo em alta"
create table if not exists public.jogos_ativos (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  jogo text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.jogos_ativos enable row level security; -- sem policies: só as funções abaixo mexem

create table if not exists public.jogos_alta (
  id uuid primary key default gen_random_uuid(),
  jogo text not null,
  jogadores integer not null,
  criado_em timestamptz not null default now()
);
alter table public.jogos_alta enable row level security;
drop policy if exists ja_ler on public.jogos_alta;
create policy ja_ler on public.jogos_alta for select to authenticated using (true);

-- O app chama a cada minuto enquanto alguém está dentro de um jogo.
-- Com 3 ou mais pessoas no mesmo jogo, cria um aviso "em alta" (no máximo 1 por jogo a cada 60 minutos).
create or replace function public.estou_jogando(p_jogo text)
returns void language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null or not public.usuario_liberado() then return; end if;
  if p_jogo not in ('xadrez', 'truco', 'memoria', 'paciencia', 'cacapalavras') then return; end if;
  insert into public.jogos_ativos (usuario_id, jogo, atualizado_em) values (auth.uid(), p_jogo, now())
    on conflict (usuario_id) do update set jogo = excluded.jogo, atualizado_em = now();
  perform pg_advisory_xact_lock(hashtext('jogos_alta_' || p_jogo));
  select count(*) into n from public.jogos_ativos where jogo = p_jogo and atualizado_em > now() - interval '3 minutes';
  if n >= 3 and not exists (select 1 from public.jogos_alta where jogo = p_jogo and criado_em > now() - interval '60 minutes') then
    insert into public.jogos_alta (jogo, jogadores) values (p_jogo, n);
  end if;
  delete from public.jogos_ativos where atualizado_em < now() - interval '1 day';
end $$;

create or replace function public.parar_de_jogar()
returns void language sql security definer set search_path = public as $$
  delete from public.jogos_ativos where usuario_id = auth.uid()
$$;

-- Jogos com 3+ pessoas agora (mostrado no menu de jogos).
create or replace function public.jogos_em_alta()
returns table (jogo text, jogadores bigint) language sql stable security definer set search_path = public as $$
  select a.jogo, count(*) from public.jogos_ativos a
  where auth.uid() is not null and a.atualizado_em > now() - interval '3 minutes'
  group by a.jogo having count(*) >= 3 order by 2 desc
$$;

revoke all on function public.estou_jogando(text), public.parar_de_jogar(), public.jogos_em_alta() from public, anon;
grant execute on function public.estou_jogando(text), public.parar_de_jogar(), public.jogos_em_alta() to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jogos_alta') then
    alter publication supabase_realtime add table public.jogos_alta;
  end if;
end $$;

-- 3. Ranking do Xadrez também por vitórias (além do Truco)
create or replace function public.ranking_jogos(p_jogo text)
returns table (nome text, melhor integer, partidas bigint, vitorias bigint)
language sql stable security definer set search_path = public as $$
  select p.nome, max(j.pontos)::integer, count(*), count(*) filter (where j.vitoria)
  from public.jogos_partidas j
  join public.perfis p on p.id = j.usuario_id
  where j.jogo = p_jogo and auth.uid() is not null and (j.modo = 'solo' or (j.detalhes ->> 'online') = 'true')
  group by p.id, p.nome
  order by case when p_jogo in ('truco', 'xadrez') then count(*) filter (where j.vitoria) else max(j.pontos) end desc, max(j.pontos) desc
  limit 10;
$$;
