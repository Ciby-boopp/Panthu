-- Panthu ADM v3: financeiro, planejamento, monitoramento, suporte, configurações, backup, LGPD, relatórios.
-- Rode UMA vez no Supabase (SQL Editor), DEPOIS de adm-fase1.sql e pontos-favoritos-lgpd.sql. Pode rodar de novo sem problemas.

-- ===== 1. Financeiro: descrição e categoria nos lançamentos =====
alter table public.financeiro add column if not exists descricao text;
alter table public.financeiro add column if not exists categoria text;

-- ===== 2. Planejamento: metas, tarefas e agenda =====
create table if not exists public.adm_tarefas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'tarefa' check (tipo in ('meta', 'tarefa', 'agenda')),
  titulo text not null check (char_length(titulo) between 3 and 140),
  descricao text,
  responsavel uuid references public.perfis(id) on delete set null,
  prazo date,
  status text not null default 'aberta' check (status in ('aberta', 'andamento', 'feita')),
  criado_por uuid default auth.uid() references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.adm_tarefas enable row level security;
drop policy if exists at_admin on public.adm_tarefas;
create policy at_admin on public.adm_tarefas for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ===== 3. Monitoramento técnico: erros do app =====
create table if not exists public.adm_erros (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.perfis(id) on delete set null,
  origem text not null default 'app',
  mensagem text not null,
  rota text,
  resolvido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists adm_erros_criado_idx on public.adm_erros (criado_em desc);
alter table public.adm_erros enable row level security;
drop policy if exists ae_admin on public.adm_erros;
create policy ae_admin on public.adm_erros for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- O app envia erros de tela por aqui (no máximo 20 por pessoa por hora; texto cortado).
create or replace function public.registrar_erro(p_mensagem text, p_rota text default null, p_origem text default 'app')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(p_mensagem, '') = '' then return; end if;
  if (select count(*) from public.adm_erros where usuario_id = auth.uid() and criado_em > now() - interval '1 hour') >= 20 then return; end if;
  insert into public.adm_erros (usuario_id, origem, mensagem, rota) values (auth.uid(), left(coalesce(p_origem, 'app'), 30), left(p_mensagem, 400), left(p_rota, 200));
end $$;
revoke all on function public.registrar_erro(text, text, text) from public, anon;
grant execute on function public.registrar_erro(text, text, text) to authenticated;

-- ===== 4. Configurações e backup =====
create table if not exists public.adm_config (
  chave text primary key,
  valor text not null default '',
  atualizado_em timestamptz not null default now()
);
insert into public.adm_config (chave, valor) values ('aviso_geral', ''), ('limite_convites_dia', '30'), ('brinde_meta_padrao', '100') on conflict (chave) do nothing;
alter table public.adm_config enable row level security;
drop policy if exists ac_admin on public.adm_config;
create policy ac_admin on public.adm_config for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
-- Todos os usuários leem só o aviso geral (mostrado no topo do app).
drop policy if exists ac_aviso on public.adm_config;
create policy ac_aviso on public.adm_config for select to authenticated using (chave = 'aviso_geral');

create table if not exists public.adm_backups (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'manual' check (tipo in ('manual', 'supabase', 'exportacao')),
  observacao text,
  criado_por uuid default auth.uid() references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.adm_backups enable row level security;
drop policy if exists ab_admin on public.adm_backups;
create policy ab_admin on public.adm_backups for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Exportação (cópia de segurança) de tabelas importantes, só para admin. Fica registrada na auditoria.
create or replace function public.adm_exportar(p_tabela text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  if p_tabela = 'perfis' then select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'email', email, 'papel', papel, 'cidade', cidade, 'ativo', ativo, 'bloqueado', bloqueado, 'criado_em', criado_em)), '[]') into r from public.perfis;
  elsif p_tabela = 'eventos' then select coalesce(jsonb_agg(to_jsonb(t)), '[]') into r from public.eventos t;
  elsif p_tabela = 'confirmacoes' then select coalesce(jsonb_agg(to_jsonb(t)), '[]') into r from public.confirmacoes t;
  elsif p_tabela = 'financeiro' then select coalesce(jsonb_agg(to_jsonb(t)), '[]') into r from public.financeiro t;
  elsif p_tabela = 'estabelecimentos' then select coalesce(jsonb_agg(to_jsonb(t)), '[]') into r from public.estabelecimentos t;
  elsif p_tabela = 'jogos_partidas' then select coalesce(jsonb_agg(to_jsonb(t)), '[]') into r from public.jogos_partidas t;
  elsif p_tabela = 'pontos_lancamentos' then select coalesce(jsonb_agg(to_jsonb(t)), '[]') into r from public.pontos_lancamentos t;
  else raise exception 'Tabela não permitida'; end if;
  insert into public.auditoria (autor_id, acao, detalhes) values (auth.uid(), 'exportacao', jsonb_build_object('tabela', p_tabela, 'linhas', jsonb_array_length(r)));
  return r;
end $$;

-- ===== 5. Suporte (atendimento) =====
create table if not exists public.suporte_tickets (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  assunto text not null check (char_length(assunto) between 3 and 120),
  mensagem text not null check (char_length(mensagem) between 5 and 2000),
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'resolvido')),
  resposta text,
  respondido_em timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.suporte_tickets enable row level security;
drop policy if exists st_ver on public.suporte_tickets;
create policy st_ver on public.suporte_tickets for select to authenticated using (usuario_id = auth.uid() or public.eh_admin());
drop policy if exists st_criar on public.suporte_tickets;
create policy st_criar on public.suporte_tickets for insert to authenticated with check (usuario_id = auth.uid() and status = 'aberto' and resposta is null);
drop policy if exists st_admin on public.suporte_tickets;
create policy st_admin on public.suporte_tickets for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ===== 6. LGPD: exclusões de conta ficam registradas (sem dados pessoais) =====
create or replace function public.auditar_exclusao_conta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.nome = 'Usuário removido' and old.nome is distinct from 'Usuário removido' then
    insert into public.auditoria (autor_id, acao, alvo_id, detalhes) values (null, 'lgpd_exclusao_conta', new.id, jsonb_build_object('tabela', 'perfis'));
  end if;
  return new;
end $$;
drop trigger if exists trg_auditar_exclusao_conta on public.perfis;
create trigger trg_auditar_exclusao_conta after update on public.perfis for each row execute function public.auditar_exclusao_conta();

create or replace function public.adm_lgpd()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  return jsonb_build_object(
    'contas', (select count(*) from public.perfis where nome <> 'Usuário removido'),
    'com_aceite_regras', (select count(*) from public.perfis where regras_aceitas_em is not null),
    'com_aceite_privacidade', (select count(*) from public.perfis where privacidade_aceita_em is not null),
    'sem_aceite', (select count(*) from public.perfis where privacidade_aceita_em is null and nome <> 'Usuário removido'),
    'exclusoes', (select count(*) from public.auditoria where acao = 'lgpd_exclusao_conta'),
    'exclusoes_30d', (select count(*) from public.auditoria where acao = 'lgpd_exclusao_conta' and criado_em > now() - interval '30 days'),
    'exportacoes_30d', (select count(*) from public.auditoria where acao = 'exportacao' and criado_em > now() - interval '30 days'),
    'compartilhando_localizacao', (select count(*) from public.localizacoes where compartilhar));
end $$;

-- ===== 7. Relatórios: cidades, hosts, jogos =====
create or replace function public.adm_cidades()
returns table (cidade text, usuarios bigint, novos_30d bigint, tem_regiao boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  return query
    select initcap(trim(p.cidade)), count(*), count(*) filter (where p.criado_em > now() - interval '30 days'),
           exists (select 1 from public.regioes r where lower(trim(r.nome)) = lower(trim(p.cidade)))
    from public.perfis p where coalesce(trim(p.cidade), '') <> '' group by lower(trim(p.cidade)), initcap(trim(p.cidade)) order by 2 desc limit 100;
end $$;

create or replace function public.adm_hosts()
returns table (id uuid, nome text, regiao text, eventos bigint, confirmados bigint, nota numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  return query
    select p.id, p.nome, coalesce(p.regiao, ''),
      (select count(*) from public.evento_hosts h where h.host_id = p.id),
      (select count(*) from public.evento_hosts h join public.confirmacoes c on c.evento_id = h.evento_id and c.status in ('confirmado', 'presente') where h.host_id = p.id),
      (select round(avg(a.nota_geral)::numeric, 1) from public.evento_hosts h join public.avaliacoes a on a.evento_id = h.evento_id where h.host_id = p.id)
    from public.perfis p where p.papel = 'host' order by 4 desc, p.nome;
end $$;

create or replace function public.adm_jogos_stats()
returns table (jogo text, partidas bigint, partidas_7d bigint, jogadores bigint, online bigint, jogando_agora bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  return query
    select j.jogo, count(*), count(*) filter (where j.criado_em > now() - interval '7 days'), count(distinct j.usuario_id),
           count(*) filter (where (j.detalhes ->> 'online') = 'true'),
           (select count(*) from public.jogos_ativos a where a.jogo = j.jogo and a.atualizado_em > now() - interval '3 minutes')
    from public.jogos_partidas j group by j.jogo order by 2 desc;
end $$;

revoke all on function public.adm_exportar(text), public.adm_lgpd(), public.adm_cidades(), public.adm_hosts(), public.adm_jogos_stats() from public, anon;
grant execute on function public.adm_exportar(text), public.adm_lgpd(), public.adm_cidades(), public.adm_hosts(), public.adm_jogos_stats() to authenticated;
