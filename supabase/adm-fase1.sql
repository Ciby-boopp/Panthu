-- ADM PANTHU — Migração Fase 1/2
-- Como rodar: Supabase → SQL Editor → New query → cole TUDO → Run.
-- O script inteiro roda numa transação: se qualquer parte falhar, NADA é aplicado.
-- Pode ser repetido sem problema (idempotente). Não apaga nem altera dados existentes.
--
-- O que faz:
--  1. Fecha a brecha em que um usuário comum poderia se promover a admin / se desbloquear.
--  2. Torna a auditoria imutável (sem UPDATE/DELETE) e passa a registrar alterações por trigger.
--  3. Protege o financeiro: exclusão só pelo fluxo autorizado, com motivo, e todo lançamento deixa antes/depois.
--  4. Cria o registro real de sessões (usuários online, histórico, dispositivos).
--  5. Cria as funções que alimentam o dashboard e a tela de conexões (só admin consegue chamar).

begin;

-- =====================================================================
-- 1. PROTEÇÃO DA TABELA perfis
-- A policy perfil_editar deixa o usuário editar a própria linha inteira.
-- Este trigger impede que alguém que não é admin mude papel, ativo, bloqueado ou região.
-- (SQL Editor e service_role não têm auth.uid(), então continuam livres.)
-- =====================================================================
create or replace function public.proteger_perfis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.eh_admin() then
    if new.papel      is distinct from old.papel
    or new.ativo      is distinct from old.ativo
    or new.bloqueado  is distinct from old.bloqueado
    or new.regiao_id  is distinct from old.regiao_id
    or new.regiao     is distinct from old.regiao then
      raise exception 'Alteração não permitida';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_perfis on public.perfis;
create trigger trg_proteger_perfis before update on public.perfis
  for each row execute function public.proteger_perfis();

-- =====================================================================
-- 2. AUDITORIA IMUTÁVEL
-- =====================================================================
alter table public.auditoria add column if not exists alvo_id uuid;
alter table public.auditoria add column if not exists resultado text not null default 'sucesso';
alter table public.auditoria alter column autor_id drop not null; -- ações do sistema/SQL não têm autor
create index if not exists auditoria_criado_idx on public.auditoria (criado_em desc);
create index if not exists auditoria_acao_idx on public.auditoria (acao);

-- Troca a policy ALL (que permitia apagar/editar) por leitura + inserção.
drop policy if exists aud_adm on public.auditoria;
drop policy if exists aud_ver on public.auditoria;
drop policy if exists aud_inserir on public.auditoria;
create policy aud_ver on public.auditoria for select to authenticated using (public.eh_admin());
create policy aud_inserir on public.auditoria for insert to authenticated
  with check (public.eh_admin() and autor_id = auth.uid());
revoke update, delete, truncate on public.auditoria from anon, authenticated;

-- Registro automático de mudanças sensíveis em perfis (só as colunas sensíveis, sem dados pessoais).
create or replace function public.auditar_perfis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.papel      is distinct from old.papel
  or new.ativo      is distinct from old.ativo
  or new.bloqueado  is distinct from old.bloqueado
  or new.regiao_id  is distinct from old.regiao_id
  or new.regiao     is distinct from old.regiao then
    insert into public.auditoria (autor_id, acao, alvo_id, detalhes) values (
      auth.uid(), 'perfis_alterado', new.id,
      jsonb_build_object('tabela', 'perfis',
        'antes',  jsonb_build_object('papel', old.papel, 'ativo', old.ativo, 'bloqueado', old.bloqueado, 'regiao_id', old.regiao_id, 'regiao', old.regiao),
        'depois', jsonb_build_object('papel', new.papel, 'ativo', new.ativo, 'bloqueado', new.bloqueado, 'regiao_id', new.regiao_id, 'regiao', new.regiao)));
  end if;
  return new;
end $$;

drop trigger if exists trg_auditar_perfis on public.perfis;
create trigger trg_auditar_perfis after update on public.perfis
  for each row execute function public.auditar_perfis();

-- Registro genérico (antes/depois) para as demais tabelas administrativas.
create or replace function public.auditar_tabela()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_row jsonb; v_alvo uuid;
begin
  v_row  := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_alvo := nullif(coalesce(v_row->>'id', v_row->>'host_id'), '')::uuid;
  insert into public.auditoria (autor_id, acao, alvo_id, detalhes) values (
    auth.uid(), tg_table_name || '_' || lower(tg_op), v_alvo,
    jsonb_build_object('tabela', tg_table_name,
      'antes',  case when tg_op = 'INSERT' then null else to_jsonb(old) end,
      'depois', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
      'motivo', nullif(current_setting('panthu.motivo', true), '')));
  return null;
end $$;

drop trigger if exists trg_auditar_host_permissoes on public.host_permissoes;
create trigger trg_auditar_host_permissoes after insert or update or delete on public.host_permissoes
  for each row execute function public.auditar_tabela();
drop trigger if exists trg_auditar_evento_hosts on public.evento_hosts;
create trigger trg_auditar_evento_hosts after insert or delete on public.evento_hosts
  for each row execute function public.auditar_tabela();
drop trigger if exists trg_auditar_regioes on public.regioes;
create trigger trg_auditar_regioes after insert or update or delete on public.regioes
  for each row execute function public.auditar_tabela();
drop trigger if exists trg_auditar_cupons on public.cupons;
create trigger trg_auditar_cupons after insert or update or delete on public.cupons
  for each row execute function public.auditar_tabela();
drop trigger if exists trg_auditar_financeiro on public.financeiro;
create trigger trg_auditar_financeiro after insert or update or delete on public.financeiro
  for each row execute function public.auditar_tabela();

-- =====================================================================
-- 3. FINANCEIRO PROTEGIDO
-- Colunas novas (lançamentos antigos ficam com status 'pago' — ajuste se algum era pendente).
-- =====================================================================
alter table public.financeiro add column if not exists status text not null default 'pago';
alter table public.financeiro add column if not exists vencimento date;
alter table public.financeiro add column if not exists comprovante_url text;
alter table public.financeiro add column if not exists criado_por uuid default auth.uid();
alter table public.financeiro add column if not exists criado_em timestamptz not null default now();
alter table public.financeiro add column if not exists atualizado_em timestamptz not null default now();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'financeiro_status_chk') then
    alter table public.financeiro add constraint financeiro_status_chk check (status in ('pago', 'pendente', 'cancelado'));
  end if;
end $$;

create or replace function public.financeiro_tocar()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists trg_financeiro_tocar on public.financeiro;
create trigger trg_financeiro_tocar before update on public.financeiro
  for each row execute function public.financeiro_tocar();

-- Exclusão direta é bloqueada; só passa pela função excluir_lancamento (admin + motivo registrado).
create or replace function public.bloquear_exclusao_financeiro()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('panthu.exclusao_autorizada', true), '') <> '1' then
    raise exception 'Exclusão financeira só pelo fluxo autorizado (excluir_lancamento), com motivo registrado.';
  end if;
  return old;
end $$;
drop trigger if exists trg_bloquear_exclusao_financeiro on public.financeiro;
create trigger trg_bloquear_exclusao_financeiro before delete on public.financeiro
  for each row execute function public.bloquear_exclusao_financeiro();

create or replace function public.excluir_lancamento(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  if p_motivo is null or char_length(trim(p_motivo)) < 10 then
    raise exception 'Informe o motivo da exclusão (mínimo 10 caracteres).';
  end if;
  perform set_config('panthu.exclusao_autorizada', '1', true);
  perform set_config('panthu.motivo', trim(p_motivo), true);
  delete from public.financeiro where id = p_id;
  perform set_config('panthu.exclusao_autorizada', '', true);
  perform set_config('panthu.motivo', '', true);
end $$;

-- =====================================================================
-- 4. SESSÕES REAIS (usuários online, histórico, dispositivos)
-- O app chama registrar_atividade() ao abrir e a cada 2 min com a aba visível.
-- Uma sessão = atividade contínua com pausas menores que 30 min.
-- =====================================================================
create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  regiao_id uuid references public.regioes(id) on delete set null,
  iniciou_em timestamptz not null default now(),
  ultima_atividade timestamptz not null default now(),
  dispositivo text,
  navegador text
);
create index if not exists sessoes_usuario_idx on public.sessoes (usuario_id, ultima_atividade desc);
create index if not exists sessoes_atividade_idx on public.sessoes (ultima_atividade desc);
alter table public.sessoes enable row level security;
drop policy if exists ses_adm on public.sessoes;
create policy ses_adm on public.sessoes for select to authenticated using (public.eh_admin());

create or replace function public.registrar_atividade(p_dispositivo text default null, p_navegador text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_reg uuid;
begin
  if auth.uid() is null then return; end if;
  select regiao_id into v_reg from public.perfis
    where id = auth.uid() and coalesce(ativo, true) and not coalesce(bloqueado, false);
  if not found then return; end if;
  select id into v_id from public.sessoes
    where usuario_id = auth.uid() and ultima_atividade > now() - interval '30 minutes'
    order by ultima_atividade desc limit 1;
  if found then
    update public.sessoes set ultima_atividade = now() where id = v_id;
  else
    insert into public.sessoes (usuario_id, regiao_id, dispositivo, navegador)
    values (auth.uid(), v_reg, left(p_dispositivo, 30), left(p_navegador, 30));
  end if;
end $$;

-- =====================================================================
-- 5. FUNÇÕES DO DASHBOARD E DAS CONEXÕES (só admin)
-- Receitas/despesas: reconhece tipo = receita/entrada e despesa/saida (sem diferenciar maiúsculas).
-- Lançamentos 'cancelado' não entram na soma.
-- =====================================================================
create or replace function public.adm_resumo()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  select jsonb_build_object(
    'usuarios_total',      (select count(*) from perfis),
    'usuarios_ativos',     (select count(*) from perfis where coalesce(ativo, true) and not coalesce(bloqueado, false)),
    'usuarios_inativos',   (select count(*) from perfis where not coalesce(ativo, true)),
    'usuarios_bloqueados', (select count(*) from perfis where coalesce(bloqueado, false)),
    'novos_7d',            (select count(*) from perfis where criado_em > now() - interval '7 days'),
    'novos_30d',           (select count(*) from perfis where criado_em > now() - interval '30 days'),
    'online_agora',        (select count(distinct usuario_id) from sessoes where ultima_atividade > now() - interval '5 minutes'),
    'acessaram_7d',        (select count(distinct usuario_id) from sessoes where ultima_atividade > now() - interval '7 days'),
    'hosts',               (select count(*) from perfis where papel = 'host'),
    'cidades_ativas',      (select count(*) from regioes where coalesce(ativa, true)),
    'eventos_total',       (select count(*) from eventos),
    'eventos_futuros',     (select count(*) from eventos where inicio >= now()),
    'eventos_realizados',  (select count(*) from eventos where inicio < now() and publicado),
    'confirmados',         (select count(*) from confirmacoes where status in ('confirmado', 'presente')),
    'presentes',           (select count(*) from confirmacoes where status = 'presente'),
    'parceiros',           (select count(*) from estabelecimentos where coalesce(ativo, true)),
    'cupons_ativos',       (select count(*) from cupons where coalesce(ativo, true) and (validade is null or validade >= current_date)),
    'denuncias_abertas',   (select count(*) from denuncias where status = 'aberta'),
    'receitas',            (select coalesce(sum(valor), 0) from financeiro where lower(tipo) in ('receita', 'entrada') and status <> 'cancelado'),
    'despesas',            (select coalesce(sum(valor), 0) from financeiro where lower(tipo) in ('despesa', 'saida', 'saída') and status <> 'cancelado'),
    'receitas_mes',        (select coalesce(sum(valor), 0) from financeiro where lower(tipo) in ('receita', 'entrada') and status <> 'cancelado' and date_trunc('month', data) = date_trunc('month', current_date)),
    'despesas_mes',        (select coalesce(sum(valor), 0) from financeiro where lower(tipo) in ('despesa', 'saida', 'saída') and status <> 'cancelado' and date_trunc('month', data) = date_trunc('month', current_date)),
    'crescimento', (
      select coalesce(jsonb_agg(jsonb_build_object('mes', to_char(m.mes, 'YYYY-MM'), 'novos', coalesce(c.n, 0)) order by m.mes), '[]'::jsonb)
      from (select date_trunc('month', now()) - make_interval(months => g) as mes from generate_series(0, 5) g) m
      left join (select date_trunc('month', criado_em) as mes, count(*) as n from perfis group by 1) c on c.mes = m.mes),
    'por_cidade', (
      select coalesce(jsonb_agg(x order by x.usuarios desc), '[]'::jsonb) from (
        select rg.cidade, rg.estado::text as estado, count(p.id) as usuarios
        from regioes rg left join perfis p on p.regiao_id = rg.id
        group by rg.id, rg.cidade, rg.estado order by 3 desc limit 10) x),
    'sem_cidade', (select count(*) from perfis where regiao_id is null)
  ) into r;
  return r;
end $$;

create or replace function public.adm_conexoes()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.eh_admin() then raise exception 'acesso negado'; end if;
  select jsonb_build_object(
    'online', (
      select coalesce(jsonb_agg(to_jsonb(y) order by y.ultima_atividade desc), '[]'::jsonb) from (
        select * from (
          select distinct on (s.usuario_id) s.usuario_id, p.nome,
                 coalesce(rg.cidade, p.regiao) as cidade, s.iniciou_em, s.ultima_atividade, s.dispositivo, s.navegador
          from sessoes s join perfis p on p.id = s.usuario_id
          left join regioes rg on rg.id = coalesce(p.regiao_id, s.regiao_id)
          where s.ultima_atividade > now() - interval '5 minutes'
          order by s.usuario_id, s.ultima_atividade desc) z
        order by z.ultima_atividade desc limit 100) y),
    'online_por_cidade', (
      select coalesce(jsonb_agg(x order by x.online desc), '[]'::jsonb) from (
        select coalesce(rg.cidade, p.regiao, 'Sem cidade') as cidade, count(distinct s.usuario_id) as online
        from sessoes s join perfis p on p.id = s.usuario_id
        left join regioes rg on rg.id = coalesce(p.regiao_id, s.regiao_id)
        where s.ultima_atividade > now() - interval '5 minutes'
        group by 1) x),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', to_char(d.dia, 'YYYY-MM-DD'), 'usuarios', coalesce(c.n, 0)) order by d.dia), '[]'::jsonb)
      from (select v_hoje - g as dia from generate_series(0, 13) g) d
      left join (select (iniciou_em at time zone 'America/Sao_Paulo')::date as dia, count(distinct usuario_id) as n
                 from sessoes group by 1) c on c.dia = d.dia),
    'por_hora', (
      select coalesce(jsonb_agg(jsonb_build_object('hora', h.hora, 'acessos', coalesce(c.n, 0)) order by h.hora), '[]'::jsonb)
      from generate_series(0, 23) as h(hora)
      left join (select extract(hour from iniciou_em at time zone 'America/Sao_Paulo')::int as hora, count(*) as n
                 from sessoes where iniciou_em > now() - interval '7 days' group by 1) c on c.hora = h.hora),
    'dispositivos', (
      select coalesce(jsonb_agg(x order by x.total desc), '[]'::jsonb) from (
        select coalesce(dispositivo, 'desconhecido') as nome, count(*) as total
        from sessoes where iniciou_em > now() - interval '30 days' group by 1) x),
    'navegadores', (
      select coalesce(jsonb_agg(x order by x.total desc), '[]'::jsonb) from (
        select coalesce(navegador, 'desconhecido') as nome, count(*) as total
        from sessoes where iniciou_em > now() - interval '30 days' group by 1) x),
    'sessoes_total', (select count(*) from sessoes)
  ) into r;
  return r;
end $$;

-- Permissões de execução: só usuários logados (adm_* ainda checam eh_admin() por dentro).
revoke execute on function public.adm_resumo(), public.adm_conexoes(),
  public.registrar_atividade(text, text), public.excluir_lancamento(uuid, text) from public, anon;
grant execute on function public.adm_resumo(), public.adm_conexoes(),
  public.registrar_atividade(text, text), public.excluir_lancamento(uuid, text) to authenticated;

commit;
