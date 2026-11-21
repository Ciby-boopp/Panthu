-- =====================================================================
-- Panthu — Busca de pessoas por cidade + Grupos temáticos do bate-papo
-- Rode UMA vez no Supabase (SQL Editor). Pode rodar de novo sem problema.
-- Não altera nenhuma tabela do chat que já existe.
-- =====================================================================

-- ===== 1. BUSCA DE PESSOAS (cidade + nome) =====
create or replace function public.norm_texto(t text)
returns text language sql immutable as $$
  select lower(translate(coalesce(t, ''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'))
$$;

-- Cidades que têm gente cadastrada (para o seletor).
create or replace function public.cidades_com_pessoas()
returns table (cidade text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not usuario_liberado() then return; end if;
  return query
    select min(trim(p.cidade)) as cidade, count(*) as total
    from perfis p
    where coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)
      and p.cidade is not null and trim(p.cidade) <> ''
    group by norm_texto(trim(p.cidade))
    order by min(trim(p.cidade));
end $$;

-- Pessoas da cidade com esse nome (ou parte do nome). Só mostra o necessário: nome, foto e se já é amigo.
create or replace function public.buscar_pessoas(p_cidade text, p_nome text)
returns table (id uuid, nome text, foto_url text, cidade text, eh_amigo boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_eu uuid := auth.uid(); v_n text := norm_texto(trim(p_nome));
begin
  if v_eu is null or not usuario_liberado() then return; end if;
  if char_length(v_n) < 2 or coalesce(trim(p_cidade), '') = '' then return; end if;
  return query
    select p.id, p.nome, p.foto_url, p.cidade,
           exists (select 1 from amigos z where z.usuario_id = v_eu and z.amigo_id = p.id)
    from perfis p
    where coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)
      and p.id <> v_eu
      and norm_texto(trim(p.cidade)) = norm_texto(trim(p_cidade))
      and norm_texto(p.nome) like '%' || replace(replace(v_n, '%', ''), '_', '') || '%'
    order by p.nome
    limit 50;
end $$;

-- O perfil (nome, foto e bio) de quem aparece na busca pode ser aberto.
create or replace function public.perfil_pessoa(p_id uuid)
returns table (id uuid, nome text, foto_url text, bio text, sou_eu boolean, mesmo_evento boolean, eh_amigo boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_eu uuid := auth.uid(); v_mesmo boolean; v_amigo boolean; v_loc boolean; v_com boolean; v_cid boolean;
begin
  if v_eu is null then return; end if;
  v_mesmo := exists (select 1 from public.confirmacoes a join public.confirmacoes b on b.evento_id = a.evento_id
    where a.usuario_id = v_eu and b.usuario_id = p_id and a.status in ('confirmado', 'presente') and b.status in ('confirmado', 'presente'));
  v_amigo := exists (select 1 from public.amigos z where z.usuario_id = v_eu and z.amigo_id = p_id);
  v_loc := exists (select 1 from public.localizacoes l where l.usuario_id = p_id and l.compartilhar and l.atualizado_em > now() - interval '12 hours');
  v_com := public.usuario_liberado() and (
    exists (select 1 from public.mensagens m join public.chat_salas s on s.id = m.sala_id where s.tipo = 'geral' and m.autor_id = p_id)
    or exists (select 1 from public.conversa_pedidos c where c.de = p_id and c.para = v_eu and c.status = 'pendente'));
  v_cid := public.usuario_liberado() and exists (select 1 from public.perfis q
    where q.id = p_id and coalesce(q.ativo, true) and not coalesce(q.bloqueado, false) and q.cidade is not null and trim(q.cidade) <> '');
  if p_id <> v_eu and not (v_mesmo or v_amigo or v_loc or v_com or v_cid) then return; end if;
  return query
    select p.id, p.nome, p.foto_url, p.bio, (p.id = v_eu), v_mesmo, v_amigo
    from public.perfis p
    where p.id = p_id and (p.id = v_eu or (coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)));
end $$;

grant execute on function public.cidades_com_pessoas(), public.buscar_pessoas(text, text), public.perfil_pessoa(uuid) to authenticated;
revoke execute on function public.cidades_com_pessoas(), public.buscar_pessoas(text, text) from anon, public;

-- ===== 2. GRUPOS TEMÁTICOS =====
create table if not exists public.grupos_tema (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descricao text not null default '',
  emoji text not null default '💬',
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.grupos_membros (
  grupo_id uuid not null references public.grupos_tema(id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  entrou_em timestamptz not null default now(),
  lido_em timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);
create table if not exists public.grupos_msgs (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_tema(id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  criado_em timestamptz not null default now()
);
create index if not exists grupos_msgs_idx on public.grupos_msgs (grupo_id, criado_em desc);

alter table public.grupos_tema enable row level security;
alter table public.grupos_membros enable row level security;
alter table public.grupos_msgs enable row level security;

drop policy if exists gt_ver on public.grupos_tema;
create policy gt_ver on public.grupos_tema for select to authenticated using (ativo and public.usuario_liberado());
drop policy if exists gm_ver on public.grupos_membros;
create policy gm_ver on public.grupos_membros for select to authenticated using (usuario_id = auth.uid());
-- (entrar/sair só pelas funções abaixo)
drop policy if exists gmsg_ver on public.grupos_msgs;
create policy gmsg_ver on public.grupos_msgs for select to authenticated
  using (public.usuario_liberado() and exists (select 1 from public.grupos_membros m where m.grupo_id = grupos_msgs.grupo_id and m.usuario_id = auth.uid()));
drop policy if exists gmsg_criar on public.grupos_msgs;
create policy gmsg_criar on public.grupos_msgs for insert to authenticated
  with check (autor_id = auth.uid() and public.usuario_liberado()
    and exists (select 1 from public.grupos_membros m where m.grupo_id = grupos_msgs.grupo_id and m.usuario_id = auth.uid()));
drop policy if exists gmsg_apagar on public.grupos_msgs;
create policy gmsg_apagar on public.grupos_msgs for delete to authenticated using (autor_id = auth.uid() or public.eh_admin());

revoke all on public.grupos_tema, public.grupos_membros, public.grupos_msgs from anon;
grant select on public.grupos_tema, public.grupos_membros to authenticated;
grant select, insert, delete on public.grupos_msgs to authenticated;

insert into public.grupos_tema (slug, nome, descricao, emoji, ordem) values
  ('cafe', 'Café e boas conversas', 'Um papo leve, de quem gosta de um bom café e de boa companhia.', '☕', 1),
  ('novos', 'Novos na cidade', 'Chegou há pouco? Troque dicas e conheça gente nova.', '🏙️', 2),
  ('viagem', 'Para quem gosta de viajar', 'Roteiros, destinos e histórias de viagem.', '✈️', 3)
on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, emoji = excluded.emoji, ordem = excluded.ordem;

-- Lista dos grupos com número de pessoas, se eu já entrei e quantas mensagens novas tenho.
create or replace function public.grupos_lista()
returns table (id uuid, slug text, nome text, descricao text, emoji text, membros bigint, participo boolean, novas bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not usuario_liberado() then return; end if;
  return query
    select g.id, g.slug, g.nome, g.descricao, g.emoji,
      (select count(*) from grupos_membros m where m.grupo_id = g.id),
      exists (select 1 from grupos_membros m where m.grupo_id = g.id and m.usuario_id = auth.uid()),
      coalesce((select count(*) from grupos_msgs x join grupos_membros me on me.grupo_id = g.id and me.usuario_id = auth.uid()
        where x.grupo_id = g.id and x.autor_id <> auth.uid() and x.criado_em > me.lido_em), 0)
    from grupos_tema g where g.ativo order by g.ordem, g.nome;
end $$;

create or replace function public.grupo_entrar(p_grupo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not usuario_liberado() then raise exception 'Não permitido'; end if;
  if not exists (select 1 from grupos_tema g where g.id = p_grupo and g.ativo) then raise exception 'Grupo indisponível'; end if;
  insert into grupos_membros (grupo_id, usuario_id) values (p_grupo, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.grupo_sair(p_grupo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  delete from grupos_membros where grupo_id = p_grupo and usuario_id = auth.uid();
end $$;

create or replace function public.grupo_marcar_lido(p_grupo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update grupos_membros set lido_em = now() where grupo_id = p_grupo and usuario_id = auth.uid();
end $$;

-- Mensagens do grupo (só para quem entrou), já com nome e foto de quem escreveu.
create or replace function public.grupo_mensagens(p_grupo uuid, p_limite int default 100)
returns table (id uuid, autor_id uuid, nome text, foto_url text, texto text, criado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not usuario_liberado() then return; end if;
  if not exists (select 1 from grupos_membros m where m.grupo_id = p_grupo and m.usuario_id = auth.uid()) then return; end if;
  return query
    select * from (
      select x.id, x.autor_id, p.nome, p.foto_url, x.texto, x.criado_em
      from grupos_msgs x join perfis p on p.id = x.autor_id
      where x.grupo_id = p_grupo order by x.criado_em desc limit least(greatest(p_limite, 1), 200)
    ) t order by t.criado_em;
end $$;

grant execute on function public.grupos_lista(), public.grupo_entrar(uuid), public.grupo_sair(uuid),
  public.grupo_marcar_lido(uuid), public.grupo_mensagens(uuid, int) to authenticated;
revoke execute on function public.grupos_lista(), public.grupo_entrar(uuid), public.grupo_sair(uuid),
  public.grupo_marcar_lido(uuid), public.grupo_mensagens(uuid, int) from anon, public;

-- Mensagens novas em tempo real (ignora se já estiver ligado).
do $$ begin
  begin alter publication supabase_realtime add table public.grupos_msgs;
  exception when duplicate_object then null; when undefined_object then null; end;
end $$;
