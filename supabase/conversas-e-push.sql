-- Panthu: pedidos de conversa com aceite, contador de não lidas no banco e inscrições de notificação push.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problemas.
-- Não altera iniciar_conversa, minhas_conversas, mensagens_sala nem titulo_sala.

-- ===== 1. Pedidos de conversa =====
create table if not exists public.conversa_pedidos (
  id uuid primary key default gen_random_uuid(),
  de uuid not null references public.perfis(id) on delete cascade,
  para uuid not null references public.perfis(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','aceito','recusado','bloqueado','cancelado')),
  sala_id uuid references public.chat_salas(id) on delete set null,
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  check (de <> para)
);
create unique index if not exists conversa_pedidos_pendente_uq on public.conversa_pedidos (de, para) where status = 'pendente';
create index if not exists conversa_pedidos_para_idx on public.conversa_pedidos (para, status);
alter table public.conversa_pedidos enable row level security;
drop policy if exists cp_ver on public.conversa_pedidos;
-- Quem pediu nunca enxerga o status "bloqueado" (para a outra pessoa não ser exposta).
create policy cp_ver on public.conversa_pedidos for select to authenticated
  using (para = auth.uid() or (de = auth.uid() and status <> 'bloqueado'));
-- Sem insert/update direto: tudo passa pelas funções abaixo.

-- Cria (ou reaproveita) a sala privada entre duas pessoas. Uso interno.
create or replace function public.criar_sala_privada(a uuid, b uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare sl uuid;
begin
  select s.id into sl from chat_salas s
    join chat_membros m1 on m1.sala_id = s.id and m1.usuario_id = a
    join chat_membros m2 on m2.sala_id = s.id and m2.usuario_id = b
    where s.tipo = 'privada' limit 1;
  if sl is null then
    insert into chat_salas (tipo) values ('privada') returning id into sl;
    insert into chat_membros (sala_id, usuario_id) values (sl, a), (sl, b);
  end if;
  return sl;
end $$;
revoke all on function public.criar_sala_privada(uuid, uuid) from public, anon, authenticated;

-- Pede para conversar. Mesmo evento: abre direto (como já era). Comunidade: fica pendente até a pessoa aceitar.
create or replace function public.pedir_conversa(outro uuid)
returns table (estado text, sala_id uuid)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare eu uuid := auth.uid(); sl uuid; ped record;
begin
  if eu is null or outro is null or outro = eu or not usuario_liberado() then raise exception 'Não permitido'; end if;
  if not exists (select 1 from perfis p where p.id = outro and p.ativo and not p.bloqueado) then raise exception 'Usuário indisponível'; end if;

  select s.id into sl from chat_salas s
    join chat_membros m1 on m1.sala_id = s.id and m1.usuario_id = eu
    join chat_membros m2 on m2.sala_id = s.id and m2.usuario_id = outro
    where s.tipo = 'privada' limit 1;
  if sl is not null then return query select 'aceito'::text, sl; return; end if;

  if exists (select 1 from confirmacoes a join confirmacoes b on a.evento_id = b.evento_id
      where a.usuario_id = eu and b.usuario_id = outro
        and a.status in ('confirmado','presente') and b.status in ('confirmado','presente')) then
    return query select 'aceito'::text, public.iniciar_conversa(outro); return;
  end if;

  -- Quem foi bloqueado vê "enviado", sem saber.
  if exists (select 1 from conversa_pedidos c where c.de = eu and c.para = outro and c.status = 'bloqueado') then
    return query select 'enviado'::text, null::uuid; return;
  end if;

  -- Se a outra pessoa já tinha pedido para falar comigo, aceitar é automático.
  select * into ped from conversa_pedidos c where c.de = outro and c.para = eu and c.status = 'pendente';
  if found then
    sl := criar_sala_privada(eu, outro);
    update conversa_pedidos set status = 'aceito', sala_id = sl, respondido_em = now() where id = ped.id;
    return query select 'aceito'::text, sl; return;
  end if;

  if exists (select 1 from conversa_pedidos c where c.de = eu and c.para = outro and c.status = 'pendente') then
    return query select 'enviado'::text, null::uuid; return;
  end if;
  if exists (select 1 from conversa_pedidos c where c.de = eu and c.para = outro and c.status = 'recusado' and c.respondido_em > now() - interval '7 days') then
    return query select 'espera'::text, null::uuid; return;
  end if;

  if not exists (select 1 from mensagens m join chat_salas s on s.id = m.sala_id where s.tipo = 'geral' and m.autor_id = outro) then
    raise exception 'Só é possível pedir conversa a quem participa da comunidade ou do seu evento';
  end if;
  if (select count(*) from conversa_pedidos c where c.de = eu and c.criado_em > now() - interval '1 day') >= 20 then
    raise exception 'Limite diário de pedidos atingido. Tente amanhã.';
  end if;

  insert into conversa_pedidos (de, para) values (eu, outro);
  return query select 'enviado'::text, null::uuid;
end $$;

create or replace function public.cancelar_pedido(outro uuid)
returns void language sql security definer set search_path = public as $$
  update conversa_pedidos set status = 'cancelado', respondido_em = now()
  where de = auth.uid() and para = outro and status = 'pendente';
$$;

-- p_acao: 'aceitar' (devolve o id da sala), 'recusar' ou 'bloquear' (devolve null).
create or replace function public.responder_pedido(p_id uuid, p_acao text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ped record; sl uuid;
begin
  if not usuario_liberado() then raise exception 'Não permitido'; end if;
  select * into ped from conversa_pedidos where id = p_id and para = auth.uid() and status = 'pendente' for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if p_acao = 'aceitar' then
    if not exists (select 1 from perfis p where p.id = ped.de and p.ativo and not p.bloqueado) then raise exception 'Usuário indisponível'; end if;
    sl := criar_sala_privada(ped.de, ped.para);
    update conversa_pedidos set status = 'aceito', sala_id = sl, respondido_em = now() where id = ped.id;
    return sl;
  elsif p_acao = 'recusar' then
    update conversa_pedidos set status = 'recusado', respondido_em = now() where id = ped.id;
  elsif p_acao = 'bloquear' then
    update conversa_pedidos set status = 'bloqueado', respondido_em = now() where id = ped.id;
  else
    raise exception 'Ação inválida';
  end if;
  return null;
end $$;

-- Situação entre mim e outra pessoa: nenhum | enviado | recebido | aceito | espera
create or replace function public.estado_pedido(outro uuid)
returns table (estado text, sala_id uuid, pedido_id uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare eu uuid := auth.uid(); sl uuid; pid uuid;
begin
  if eu is null or not usuario_liberado() then return; end if;
  select s.id into sl from chat_salas s
    join chat_membros m1 on m1.sala_id = s.id and m1.usuario_id = eu
    join chat_membros m2 on m2.sala_id = s.id and m2.usuario_id = outro
    where s.tipo = 'privada' limit 1;
  if sl is not null then return query select 'aceito'::text, sl, null::uuid; return; end if;
  select c.id into pid from conversa_pedidos c where c.de = outro and c.para = eu and c.status = 'pendente';
  if pid is not null then return query select 'recebido'::text, null::uuid, pid; return; end if;
  if exists (select 1 from conversa_pedidos c where c.de = eu and c.para = outro and c.status in ('pendente','bloqueado')) then
    return query select 'enviado'::text, null::uuid, null::uuid; return;
  end if;
  if exists (select 1 from conversa_pedidos c where c.de = eu and c.para = outro and c.status = 'recusado' and c.respondido_em > now() - interval '7 days') then
    return query select 'espera'::text, null::uuid, null::uuid; return;
  end if;
  return query select 'nenhum'::text, null::uuid, null::uuid;
end $$;

create or replace function public.meus_pedidos_recebidos()
returns table (id uuid, de uuid, nome text, foto_url text, criado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.de, nome_curto(p.nome), p.foto_url, c.criado_em
  from conversa_pedidos c join perfis p on p.id = c.de
  where c.para = auth.uid() and c.status = 'pendente' and usuario_liberado() and p.ativo and not p.bloqueado
  order by c.criado_em desc
$$;

-- ===== 2. Perfil visível também para quem escreveu na comunidade (ou me pediu para conversar) =====
-- Continua mostrando só nome, foto e bio. Mesma assinatura de antes.
create or replace function public.perfil_pessoa(p_id uuid)
returns table (id uuid, nome text, foto_url text, bio text, sou_eu boolean, mesmo_evento boolean, eh_amigo boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_eu uuid := auth.uid(); v_mesmo boolean; v_amigo boolean; v_loc boolean; v_com boolean;
begin
  if v_eu is null then return; end if;
  v_mesmo := exists (select 1 from public.confirmacoes a join public.confirmacoes b on b.evento_id = a.evento_id
    where a.usuario_id = v_eu and b.usuario_id = p_id and a.status in ('confirmado', 'presente') and b.status in ('confirmado', 'presente'));
  v_amigo := exists (select 1 from public.amigos z where z.usuario_id = v_eu and z.amigo_id = p_id);
  v_loc := exists (select 1 from public.localizacoes l where l.usuario_id = p_id and l.compartilhar and l.atualizado_em > now() - interval '12 hours');
  v_com := public.usuario_liberado() and (
    exists (select 1 from public.mensagens m join public.chat_salas s on s.id = m.sala_id where s.tipo = 'geral' and m.autor_id = p_id)
    or exists (select 1 from public.conversa_pedidos c where c.de = p_id and c.para = v_eu and c.status = 'pendente'));
  if p_id <> v_eu and not (v_mesmo or v_amigo or v_loc or v_com) then return; end if;
  return query
    select p.id, p.nome, p.foto_url, p.bio, (p.id = v_eu), v_mesmo, v_amigo
    from public.perfis p
    where p.id = p_id and (p.id = v_eu or (coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)));
end $$;

-- ===== 3. Mensagens não lidas guardadas no banco (vale em qualquer aparelho) =====
create table if not exists public.chat_leituras (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  sala_id uuid not null references public.chat_salas(id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (usuario_id, sala_id)
);
alter table public.chat_leituras enable row level security;
drop policy if exists cl_proprias on public.chat_leituras;
create policy cl_proprias on public.chat_leituras for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create or replace function public.marcar_lida(sl uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not acessa_sala(sl) then return; end if;
  insert into chat_leituras (usuario_id, sala_id, lido_em) values (auth.uid(), sl, now())
  on conflict (usuario_id, sala_id) do update set lido_em = now();
end $$;

-- Não lidas por sala. Na comunidade e nos eventos, o que veio antes da primeira consulta conta como lido.
create or replace function public.nao_lidas()
returns table (sala_id uuid, total bigint)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null or not usuario_liberado() then return; end if;
  insert into chat_leituras (usuario_id, sala_id, lido_em)
    select auth.uid(), c.sala_id, now() from minhas_conversas() c where c.tipo in ('geral', 'evento')
    on conflict do nothing;
  return query
    select c.sala_id, count(x.id)
    from minhas_conversas() c
    left join chat_leituras l on l.usuario_id = auth.uid() and l.sala_id = c.sala_id
    join mensagens x on x.sala_id = c.sala_id and x.autor_id <> auth.uid() and x.criado_em > coalesce(l.lido_em, '-infinity'::timestamptz)
    group by c.sala_id;
end $$;

-- ===== 4. Notificações push =====
create table if not exists public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
drop policy if exists pi_proprias on public.push_inscricoes;
create policy pi_proprias on public.push_inscricoes for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create table if not exists public.push_prefs (
  usuario_id uuid primary key default auth.uid() references public.perfis(id) on delete cascade,
  previa boolean not null default true,
  comunidade boolean not null default true
);
alter table public.push_prefs enable row level security;
drop policy if exists pp_proprias on public.push_prefs;
create policy pp_proprias on public.push_prefs for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create or replace function public.salvar_inscricao_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Não permitido'; end if;
  insert into push_inscricoes (usuario_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set usuario_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

-- ===== 5. Tempo real para os pedidos =====
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversa_pedidos') then
    alter publication supabase_realtime add table public.conversa_pedidos;
  end if;
end $$;

-- ===== 6. Permissões =====
revoke all on function public.pedir_conversa(uuid), public.cancelar_pedido(uuid), public.responder_pedido(uuid, text),
  public.estado_pedido(uuid), public.meus_pedidos_recebidos(), public.marcar_lida(uuid), public.nao_lidas(),
  public.salvar_inscricao_push(text, text, text) from public, anon;
grant execute on function public.pedir_conversa(uuid), public.cancelar_pedido(uuid), public.responder_pedido(uuid, text),
  public.estado_pedido(uuid), public.meus_pedidos_recebidos(), public.marcar_lida(uuid), public.nao_lidas(),
  public.salvar_inscricao_push(text, text, text) to authenticated;
