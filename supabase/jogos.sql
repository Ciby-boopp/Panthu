-- Panthu: jogos de cartas (ranking e histórico de partidas).
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problemas.
-- (O Truco online usa Realtime Broadcast, que já vem ativo e não precisa de tabela.)

create table if not exists public.jogos_partidas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  jogo text not null check (jogo in ('blackjack', 'memoria', 'truco', 'paciencia')),
  modo text not null check (modo in ('solo', 'dois')),
  pontos integer not null default 0 check (pontos between 0 and 100000),
  vitoria boolean,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists jogos_partidas_rank_idx on public.jogos_partidas (jogo, modo, pontos desc);
create index if not exists jogos_partidas_usuario_idx on public.jogos_partidas (usuario_id, criado_em desc);

alter table public.jogos_partidas enable row level security;
drop policy if exists jp_inserir on public.jogos_partidas;
create policy jp_inserir on public.jogos_partidas for insert to authenticated with check (usuario_id = auth.uid());
drop policy if exists jp_ver_proprias on public.jogos_partidas;
create policy jp_ver_proprias on public.jogos_partidas for select to authenticated using (usuario_id = auth.uid());

-- Top 10 (só partidas de 1 jogador). No Truco ordena por vitórias; nos demais, pela melhor pontuação.
create or replace function public.ranking_jogos(p_jogo text)
returns table (nome text, melhor integer, partidas bigint, vitorias bigint)
language sql stable security definer set search_path = public as $$
  select p.nome, max(j.pontos)::integer, count(*), count(*) filter (where j.vitoria)
  from public.jogos_partidas j
  join public.perfis p on p.id = j.usuario_id
  where j.jogo = p_jogo and j.modo = 'solo' and auth.uid() is not null
  group by p.id, p.nome
  order by case when p_jogo = 'truco' then count(*) filter (where j.vitoria) else max(j.pontos) end desc, max(j.pontos) desc
  limit 10;
$$;
revoke all on function public.ranking_jogos(text) from public;
grant execute on function public.ranking_jogos(text) to authenticated;
