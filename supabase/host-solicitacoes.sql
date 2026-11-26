-- =====================================================================
-- Panthu — "Quero ser host": pedidos dos participantes para o administrador
-- Rode UMA vez no Supabase (SQL Editor). Pode rodar de novo sem problema.
-- =====================================================================
create table if not exists public.host_pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  motivo text not null check (char_length(motivo) between 10 and 600),
  cidade text not null check (char_length(cidade) between 2 and 80),
  experiencia text not null check (experiencia in ('sim', 'nao')),
  detalhe_experiencia text check (detalhe_experiencia is null or char_length(detalhe_experiencia) <= 400),
  disponibilidade text not null check (disponibilidade in ('semana_noite', 'fim_de_semana', 'qualquer_dia')),
  contato text check (contato is null or char_length(contato) <= 60),
  aceitou_diretrizes boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  resposta_admin text check (resposta_admin is null or char_length(resposta_admin) <= 400),
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por uuid references public.perfis(id) on delete set null
);
create unique index if not exists host_pedidos_um_pendente on public.host_pedidos (usuario_id) where status = 'pendente';
create index if not exists host_pedidos_status_idx on public.host_pedidos (status, criado_em desc);

alter table public.host_pedidos enable row level security;
drop policy if exists hp_ver_meu on public.host_pedidos;
create policy hp_ver_meu on public.host_pedidos for select to authenticated using (usuario_id = auth.uid() or public.eh_admin());
revoke all on public.host_pedidos from anon;
grant select on public.host_pedidos to authenticated;
-- (criar e decidir só pelas funções abaixo)

-- A pessoa envia o pedido.
create or replace function public.host_pedir(p_motivo text, p_cidade text, p_experiencia text, p_detalhe text,
  p_disponibilidade text, p_contato text, p_aceitou boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_papel text;
begin
  if auth.uid() is null or not usuario_liberado() then raise exception 'Não permitido'; end if;
  select papel into v_papel from perfis where id = auth.uid();
  if v_papel in ('host', 'admin') then raise exception 'Você já tem acesso de host.'; end if;
  if not coalesce(p_aceitou, false) then raise exception 'É preciso aceitar as diretrizes da comunidade.'; end if;
  if exists (select 1 from host_pedidos where usuario_id = auth.uid() and status = 'pendente') then raise exception 'Você já tem um pedido em análise.'; end if;
  insert into host_pedidos (usuario_id, motivo, cidade, experiencia, detalhe_experiencia, disponibilidade, contato, aceitou_diretrizes)
    values (auth.uid(), trim(p_motivo), trim(p_cidade), p_experiencia, nullif(trim(coalesce(p_detalhe, '')), ''), p_disponibilidade, nullif(trim(coalesce(p_contato, '')), ''), true)
    returning id into v_id;
  return v_id;
end $$;

-- O administrador aprova (a pessoa vira host) ou recusa.
create or replace function public.host_decidir(p_id uuid, p_aprovar boolean, p_resposta text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if auth.uid() is null or not eh_admin() then raise exception 'Somente administradores.'; end if;
  select usuario_id into v_user from host_pedidos where id = p_id and status = 'pendente';
  if v_user is null then raise exception 'Pedido não encontrado ou já decidido.'; end if;
  update host_pedidos set status = case when p_aprovar then 'aprovado' else 'recusado' end,
    resposta_admin = nullif(trim(coalesce(p_resposta, '')), ''), decidido_em = now(), decidido_por = auth.uid() where id = p_id;
  if p_aprovar then update perfis set papel = 'host' where id = v_user and papel not in ('admin'); end if;
end $$;

grant execute on function public.host_pedir(text, text, text, text, text, text, boolean), public.host_decidir(uuid, boolean, text) to authenticated;
revoke execute on function public.host_pedir(text, text, text, text, text, text, boolean), public.host_decidir(uuid, boolean, text) from anon, public;
