-- Panthu: cadastro inteligente, pontos e brindes, favoritos, indicação de amigos, LGPD, convites para jogar e ranking geral.
-- Rode UMA vez no Supabase: SQL Editor -> New query -> cole tudo -> Run. Pode rodar de novo sem problemas.
-- ANTES, rode (se ainda não rodou): atualizacao-2.sql, jogos.sql, conversas-e-push.sql e adm-fase1.sql.
-- Observação: a tabela "cupons" do ADM não é alterada. Os brindes por pontos usam pontos_brindes e pontos_cupons.

-- ===== 1. Perfil: cidade, interesses, o que procura, aceites e código de indicação =====
alter table public.perfis
  add column if not exists cidade text,
  add column if not exists interesses text[] not null default '{}',
  add column if not exists hobbies text[] not null default '{}',
  add column if not exists procura text[] not null default '{}',
  add column if not exists onboarding_em timestamptz,
  add column if not exists regras_aceitas_em timestamptz,
  add column if not exists privacidade_aceita_em timestamptz,
  add column if not exists versao_termos text,
  add column if not exists codigo_indicacao text,
  add column if not exists indicado_por uuid references public.perfis(id) on delete set null;

create or replace function public.novo_codigo_indicacao()
returns text language plpgsql as $$
declare c text;
begin
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.perfis where codigo_indicacao = c);
  end loop;
  return c;
end $$;

update public.perfis set codigo_indicacao = public.novo_codigo_indicacao() where codigo_indicacao is null;
create unique index if not exists perfis_codigo_indicacao_uq on public.perfis (codigo_indicacao);

create or replace function public.trg_perfis_codigo()
returns trigger language plpgsql as $$
begin
  if new.codigo_indicacao is null then new.codigo_indicacao := public.novo_codigo_indicacao(); end if;
  return new;
end $$;
drop trigger if exists trg_perfis_codigo on public.perfis;
create trigger trg_perfis_codigo before insert on public.perfis for each row execute function public.trg_perfis_codigo();

-- Só funções do sistema (ou admin) mudam o código e quem indicou.
create or replace function public.proteger_perfis_extra()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(current_setting('panthu.rpc', true), '') <> '1' and not public.eh_admin() then
    if new.codigo_indicacao is distinct from old.codigo_indicacao or new.indicado_por is distinct from old.indicado_por then
      raise exception 'Alteração não permitida';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_proteger_perfis_extra on public.perfis;
create trigger trg_proteger_perfis_extra before update on public.perfis for each row execute function public.proteger_perfis_extra();

-- ===== 2. Pontos (regras editáveis pelo admin), brindes e cupons =====
create table if not exists public.pontos_regras (
  codigo text primary key,
  nome text not null,
  descricao text,
  pontos integer not null default 0 check (pontos between 0 and 1000),
  limite_dia integer check (limite_dia is null or limite_dia >= 0),
  unico boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 100
);
insert into public.pontos_regras (codigo, nome, descricao, pontos, limite_dia, unico, ordem) values
  ('perfil_completo',      'Perfil completo',        'Foto, biografia, cidade e pelo menos um interesse preenchidos.', 10, null, true, 10),
  ('cadastro_inteligente', 'Contar seus gostos',     'Responder as perguntas de boas-vindas (cidade, interesses e o que procura).', 5, null, true, 20),
  ('confirmar_evento',     'Confirmar presença',     'Confirmar presença em um encontro (uma vez por encontro).', 2, null, false, 30),
  ('presenca_evento',      'Estar no encontro',      'Ter a presença registrada no encontro (uma vez por encontro).', 5, null, false, 40),
  ('avaliar_evento',       'Avaliar um encontro',    'Enviar a sua avaliação de um encontro.', 3, null, false, 50),
  ('indicar_amigo',        'Indicar um amigo',       'Um amigo entra com o seu código e conclui o cadastro.', 20, null, false, 60),
  ('vitoria_jogo',         'Vencer um jogo',         'Ganhar uma partida (até 10 vitórias por dia contam).', 2, 10, false, 70),
  ('participar_jogo',      'Jogar uma partida',      'Terminar uma partida (até 5 por dia contam).', 1, 5, false, 80)
on conflict (codigo) do nothing;

create table if not exists public.pontos_lancamentos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  regra text not null references public.pontos_regras(codigo) on delete restrict,
  pontos integer not null,
  ref text,
  criado_em timestamptz not null default now()
);
create unique index if not exists pontos_lanc_ref_uq on public.pontos_lancamentos (usuario_id, regra, ref) where ref is not null;
create index if not exists pontos_lanc_usuario_idx on public.pontos_lancamentos (usuario_id, criado_em desc);

create table if not exists public.pontos_brindes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  meta integer not null check (meta > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
insert into public.pontos_brindes (nome, descricao, meta)
  select 'Brinde em um encontro', 'Retire o seu brinde com um host, mostrando o código do cupom.', 100
  where not exists (select 1 from public.pontos_brindes);

create table if not exists public.pontos_cupons (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  brinde_id uuid not null references public.pontos_brindes(id) on delete cascade,
  codigo text not null unique,
  status text not null default 'disponivel' check (status in ('disponivel', 'usado', 'cancelado')),
  criado_em timestamptz not null default now(),
  usado_em timestamptz,
  usado_por uuid references public.perfis(id) on delete set null,
  unique (usuario_id, brinde_id)
);

alter table public.pontos_regras enable row level security;
alter table public.pontos_lancamentos enable row level security;
alter table public.pontos_brindes enable row level security;
alter table public.pontos_cupons enable row level security;
drop policy if exists pr_ler on public.pontos_regras;
create policy pr_ler on public.pontos_regras for select to authenticated using (true);
drop policy if exists pr_admin on public.pontos_regras;
create policy pr_admin on public.pontos_regras for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists pb_ler on public.pontos_brindes;
create policy pb_ler on public.pontos_brindes for select to authenticated using (true);
drop policy if exists pb_admin on public.pontos_brindes;
create policy pb_admin on public.pontos_brindes for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists pl_proprios on public.pontos_lancamentos;
create policy pl_proprios on public.pontos_lancamentos for select to authenticated using (usuario_id = auth.uid() or public.eh_admin());
drop policy if exists pc_ver on public.pontos_cupons;
create policy pc_ver on public.pontos_cupons for select to authenticated using (usuario_id = auth.uid() or public.eh_admin());
-- Sem insert/update direto em lançamentos e cupons: só pelas funções abaixo.

create or replace function public.verificar_brindes(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare total integer;
begin
  select coalesce(sum(pontos), 0) into total from public.pontos_lancamentos where usuario_id = p_user;
  insert into public.pontos_cupons (usuario_id, brinde_id, codigo)
  select p_user, b.id, 'PTH-' || upper(substr(md5(random()::text || clock_timestamp()::text || b.id::text), 1, 8))
  from public.pontos_brindes b
  where b.ativo and b.meta <= total
    and not exists (select 1 from public.pontos_cupons c where c.usuario_id = p_user and c.brinde_id = b.id)
  on conflict do nothing;
end $$;

create or replace function public.dar_pontos(p_user uuid, p_regra text, p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.pontos_regras%rowtype;
        hoje timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  select * into r from public.pontos_regras where codigo = p_regra and ativo;
  if not found or r.pontos <= 0 then return; end if;
  if r.unico and p_ref is null and exists (select 1 from public.pontos_lancamentos where usuario_id = p_user and regra = p_regra) then return; end if;
  if r.limite_dia is not null and (select count(*) from public.pontos_lancamentos where usuario_id = p_user and regra = p_regra and criado_em >= hoje) >= r.limite_dia then return; end if;
  insert into public.pontos_lancamentos (usuario_id, regra, pontos, ref) values (p_user, p_regra, r.pontos, p_ref) on conflict do nothing;
  perform public.verificar_brindes(p_user);
end $$;
revoke all on function public.verificar_brindes(uuid), public.dar_pontos(uuid, text, text) from public, anon, authenticated;

-- Gatilhos que dão os pontos sozinhos
create or replace function public.trg_pontos_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.nome, '') <> '' and coalesce(new.foto_url, '') <> '' and coalesce(new.bio, '') <> ''
     and coalesce(new.cidade, '') <> '' and coalesce(array_length(new.interesses, 1), 0) > 0 then
    perform public.dar_pontos(new.id, 'perfil_completo');
  end if;
  if new.onboarding_em is not null and old.onboarding_em is null then
    perform public.dar_pontos(new.id, 'cadastro_inteligente');
    if new.indicado_por is not null then perform public.dar_pontos(new.indicado_por, 'indicar_amigo', new.id::text); end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_pontos_perfil on public.perfis;
create trigger trg_pontos_perfil after update on public.perfis for each row execute function public.trg_pontos_perfil();

create or replace function public.trg_pontos_confirmacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('confirmado', 'presente') then perform public.dar_pontos(new.usuario_id, 'confirmar_evento', new.evento_id::text); end if;
  if new.status = 'presente' then perform public.dar_pontos(new.usuario_id, 'presenca_evento', new.evento_id::text); end if;
  return new;
end $$;
drop trigger if exists trg_pontos_confirmacao on public.confirmacoes;
create trigger trg_pontos_confirmacao after insert or update of status on public.confirmacoes for each row execute function public.trg_pontos_confirmacao();

create or replace function public.trg_pontos_avaliacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.dar_pontos(new.usuario_id, 'avaliar_evento', new.evento_id::text);
  return new;
end $$;
drop trigger if exists trg_pontos_avaliacao on public.avaliacoes;
create trigger trg_pontos_avaliacao after insert on public.avaliacoes for each row execute function public.trg_pontos_avaliacao();

create or replace function public.trg_pontos_partida()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.dar_pontos(new.usuario_id, 'participar_jogo');
  if new.vitoria is true then perform public.dar_pontos(new.usuario_id, 'vitoria_jogo'); end if;
  return new;
end $$;
drop trigger if exists trg_pontos_partida on public.jogos_partidas;
create trigger trg_pontos_partida after insert on public.jogos_partidas for each row execute function public.trg_pontos_partida();

create or replace function public.pontos_resumo()
returns table (total integer, proxima_meta integer, proxima_nome text)
language sql stable security definer set search_path = public as $$
  with t as (select coalesce(sum(pontos), 0)::integer as total from public.pontos_lancamentos where usuario_id = auth.uid())
  select t.total,
         (select min(b.meta) from public.pontos_brindes b where b.ativo and b.meta > t.total),
         (select b.nome from public.pontos_brindes b where b.ativo and b.meta > t.total order by b.meta limit 1)
  from t
$$;

-- Host ou admin confere (e, se p_usar, dá baixa em) um cupom de brinde.
create or replace function public.validar_cupom_pontos(p_codigo text, p_usar boolean default false)
returns table (valido boolean, mensagem text, pessoa text, brinde text, status text)
language plpgsql security definer set search_path = public as $$
declare cp record;
begin
  if not exists (select 1 from public.perfis where id = auth.uid() and papel in ('host', 'admin') and ativo and not bloqueado) then
    raise exception 'Não permitido';
  end if;
  select c.id, c.status as st, p.nome as pessoa, b.nome as brinde into cp
  from public.pontos_cupons c join public.perfis p on p.id = c.usuario_id join public.pontos_brindes b on b.id = c.brinde_id
  where c.codigo = upper(trim(p_codigo));
  if not found then return query select false, 'Cupom não encontrado.', null::text, null::text, null::text; return; end if;
  if cp.st <> 'disponivel' then return query select false, 'Este cupom já foi usado ou cancelado.', cp.pessoa, cp.brinde, cp.st; return; end if;
  if p_usar then
    update public.pontos_cupons set status = 'usado', usado_em = now(), usado_por = auth.uid() where id = cp.id;
    return query select true, 'Cupom usado. Entregue o brinde.', cp.pessoa, cp.brinde, 'usado'::text;
  end if;
  return query select true, 'Cupom válido.', cp.pessoa, cp.brinde, cp.st;
end $$;

-- ===== 3. Favoritos (eventos, grupos, pessoas e estabelecimentos) =====
create table if not exists public.favoritos (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null check (tipo in ('evento', 'grupo', 'pessoa', 'estabelecimento')),
  item_id text not null,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, tipo, item_id)
);
alter table public.favoritos enable row level security;
drop policy if exists fav_proprios on public.favoritos;
create policy fav_proprios on public.favoritos for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create or replace function public.alternar_favorito(p_tipo text, p_item text)
returns boolean language plpgsql security definer set search_path = public as $$
declare removidos integer;
begin
  if auth.uid() is null or not public.usuario_liberado() then raise exception 'Não permitido'; end if;
  delete from public.favoritos where usuario_id = auth.uid() and tipo = p_tipo and item_id = p_item;
  get diagnostics removidos = row_count;
  if removidos > 0 then return false; end if;
  if (select count(*) from public.favoritos where usuario_id = auth.uid()) >= 300 then raise exception 'Limite de favoritos atingido'; end if;
  insert into public.favoritos (usuario_id, tipo, item_id) values (auth.uid(), p_tipo, p_item);
  return true;
end $$;

create or replace function public.meus_favoritos()
returns table (tipo text, item_id text, titulo text, subtitulo text, foto_url text)
language sql stable security definer set search_path = public as $$
  select x.tipo, x.item_id, x.titulo, x.subtitulo, x.foto_url from (
    select f.tipo, f.item_id, f.criado_em,
      case f.tipo when 'evento' then e.nome when 'estabelecimento' then s.nome when 'pessoa' then public.nome_curto(p.nome) else public.titulo_sala(g.id) end as titulo,
      case f.tipo when 'evento' then to_char(e.inicio at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') when 'estabelecimento' then s.endereco else null end as subtitulo,
      case f.tipo when 'evento' then e.banner_url when 'estabelecimento' then s.logo_url when 'pessoa' then p.foto_url else null end as foto_url
    from public.favoritos f
      left join public.eventos e on f.tipo = 'evento' and e.id::text = f.item_id
      left join public.estabelecimentos s on f.tipo = 'estabelecimento' and s.id::text = f.item_id
      left join public.perfis p on f.tipo = 'pessoa' and p.id::text = f.item_id and p.ativo and not p.bloqueado
      left join public.chat_salas g on f.tipo = 'grupo' and g.id::text = f.item_id
    where f.usuario_id = auth.uid()
  ) x where x.titulo is not null order by x.criado_em desc
$$;

-- ===== 4. Indicação de amigos (link ou código) =====
create table if not exists public.indicacoes (
  id bigint generated always as identity primary key,
  indicador uuid not null references public.perfis(id) on delete cascade,
  indicado uuid not null unique references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.indicacoes enable row level security;
drop policy if exists ind_proprias on public.indicacoes;
create policy ind_proprias on public.indicacoes for select to authenticated using (indicador = auth.uid());

-- Devolve: ok | invalido | proprio | ja_indicado | tarde
create or replace function public.usar_codigo_indicacao(p_codigo text)
returns text language plpgsql security definer set search_path = public as $$
declare dono uuid;
begin
  if auth.uid() is null then raise exception 'Não permitido'; end if;
  select id into dono from public.perfis where codigo_indicacao = upper(trim(p_codigo));
  if dono is null then return 'invalido'; end if;
  if dono = auth.uid() then return 'proprio'; end if;
  if exists (select 1 from public.perfis where id = auth.uid() and indicado_por is not null) then return 'ja_indicado'; end if;
  if exists (select 1 from public.perfis where id = auth.uid() and onboarding_em is not null) then return 'tarde'; end if;
  perform set_config('panthu.rpc', '1', true);
  update public.perfis set indicado_por = dono where id = auth.uid();
  insert into public.indicacoes (indicador, indicado) values (dono, auth.uid()) on conflict do nothing;
  return 'ok';
end $$;

create or replace function public.minhas_indicacoes()
returns table (nome text, criado_em timestamptz, concluido boolean)
language sql stable security definer set search_path = public as $$
  select public.nome_curto(p.nome), i.criado_em, p.onboarding_em is not null
  from public.indicacoes i join public.perfis p on p.id = i.indicado
  where i.indicador = auth.uid() order by i.criado_em desc
$$;

-- ===== 5. LGPD: baixar meus dados e excluir minha conta =====
create or replace function public.exportar_meus_dados()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare eu uuid := auth.uid(); r jsonb;
begin
  if eu is null then raise exception 'Não permitido'; end if;
  r := jsonb_build_object(
    'gerado_em', now(),
    'perfil', (select to_jsonb(p) from public.perfis p where p.id = eu),
    'presencas', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.confirmacoes c where c.usuario_id = eu),
    'avaliacoes', (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from public.avaliacoes a where a.usuario_id = eu),
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('sala_id', m.sala_id, 'texto', m.texto, 'criado_em', m.criado_em)), '[]'::jsonb) from public.mensagens m where m.autor_id = eu),
    'amigos_salvos', (select coalesce(jsonb_agg(to_jsonb(z)), '[]'::jsonb) from public.amigos z where z.usuario_id = eu),
    'favoritos', (select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) from public.favoritos f where f.usuario_id = eu),
    'partidas', (select coalesce(jsonb_agg(to_jsonb(j)), '[]'::jsonb) from public.jogos_partidas j where j.usuario_id = eu),
    'pontos', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from public.pontos_lancamentos l where l.usuario_id = eu),
    'cupons_brinde', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.pontos_cupons c where c.usuario_id = eu));
  return r;
end $$;

create or replace function public._limpar(t text, cond text, uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if to_regclass('public.' || t) is not null then execute format('delete from public.%I where %s', t, cond) using uid; end if;
end $$;
revoke all on function public._limpar(text, text, uuid) from public, anon, authenticated;

-- Apaga dados pessoais e desativa a conta. As mensagens ficam, sem nome (conteúdo coletivo do chat).
create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = public as $$
declare eu uuid := auth.uid();
begin
  if eu is null then raise exception 'Não permitido'; end if;
  perform public._limpar('push_inscricoes', 'usuario_id = $1', eu);
  perform public._limpar('push_prefs', 'usuario_id = $1', eu);
  perform public._limpar('favoritos', 'usuario_id = $1', eu);
  perform public._limpar('chat_leituras', 'usuario_id = $1', eu);
  perform public._limpar('conversa_pedidos', 'de = $1 or para = $1', eu);
  perform public._limpar('jogos_convites', 'de = $1 or para = $1', eu);
  perform public._limpar('amigos', 'usuario_id = $1 or amigo_id = $1', eu);
  perform public._limpar('localizacoes', 'usuario_id = $1', eu);
  perform public._limpar('pontos_cupons', 'usuario_id = $1', eu);
  perform public._limpar('indicacoes', 'indicador = $1 or indicado = $1', eu);
  -- Libera a edição dos campos protegidos só dentro desta transação (a função é o fluxo autorizado).
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  update public.perfis set nome = 'Usuário removido', bio = null, foto_url = null, cidade = null,
    interesses = '{}', hobbies = '{}', procura = '{}', indicado_por = null, ativo = false where id = eu;
  begin
    update public.perfis set telefone = null, email = null where id = eu;
  exception when others then
    update public.perfis set telefone = '', email = 'removido-' || eu::text || '@removido.invalid' where id = eu;
  end;
  begin
    delete from auth.users where id = eu;
  exception when others then
    begin update auth.users set banned_until = 'infinity' where id = eu; exception when others then null; end;
  end;
end $$;

-- ===== 6. Convites para jogar com amigos =====
create table if not exists public.jogos_convites (
  id uuid primary key default gen_random_uuid(),
  de uuid not null references public.perfis(id) on delete cascade,
  para uuid not null references public.perfis(id) on delete cascade,
  jogo text not null check (jogo in ('truco', 'memoria')),
  sala text not null,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'cancelado')),
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  check (de <> para)
);
create index if not exists jogos_convites_para_idx on public.jogos_convites (para, status, criado_em desc);
alter table public.jogos_convites enable row level security;
drop policy if exists jc_ver on public.jogos_convites;
create policy jc_ver on public.jogos_convites for select to authenticated using (de = auth.uid() or para = auth.uid());

create or replace function public.pessoas_para_jogar()
returns table (id uuid, nome text, foto_url text)
language sql stable security definer set search_path = public as $$
  select distinct p.id, public.nome_curto(p.nome) as nome, p.foto_url
  from public.perfis p
  where public.usuario_liberado() and p.ativo and not p.bloqueado and p.id <> auth.uid() and (
    exists (select 1 from public.amigos a where a.usuario_id = auth.uid() and a.amigo_id = p.id)
    or exists (select 1 from public.chat_membros m1 join public.chat_membros m2 on m2.sala_id = m1.sala_id
               join public.chat_salas s on s.id = m1.sala_id
               where s.tipo = 'privada' and m1.usuario_id = auth.uid() and m2.usuario_id = p.id))
  order by 2
$$;

create or replace function public.convidar_para_jogar(p_para uuid, p_jogo text)
returns table (id uuid, sala text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare novo uuid; cod text;
begin
  if not public.usuario_liberado() then raise exception 'Não permitido'; end if;
  if p_jogo not in ('truco', 'memoria') then raise exception 'Jogo inválido'; end if;
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

create or replace function public.ver_convite(p_id uuid)
returns table (id uuid, de uuid, para uuid, de_nome text, para_nome text, jogo text, sala text, status text, expirado boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.de, c.para, public.nome_curto(a.nome), public.nome_curto(b.nome), c.jogo, c.sala, c.status,
         c.criado_em < now() - interval '10 minutes'
  from public.jogos_convites c join public.perfis a on a.id = c.de join public.perfis b on b.id = c.para
  where c.id = p_id and (c.de = auth.uid() or c.para = auth.uid())
$$;

-- p_acao: aceitar | recusar (quem recebeu) ou cancelar (quem chamou). Devolve o jogo e a sala ao aceitar.
create or replace function public.responder_convite(p_id uuid, p_acao text)
returns table (jogo text, sala text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare c public.jogos_convites%rowtype;
begin
  select * into c from public.jogos_convites where id = p_id and status = 'pendente' for update;
  if not found then raise exception 'Convite não encontrado ou já respondido.'; end if;
  if p_acao = 'cancelar' then
    if c.de <> auth.uid() then raise exception 'Não permitido'; end if;
    update public.jogos_convites set status = 'cancelado', respondido_em = now() where id = p_id;
    return;
  end if;
  if c.para <> auth.uid() then raise exception 'Não permitido'; end if;
  if c.criado_em < now() - interval '10 minutes' then
    update public.jogos_convites set status = 'cancelado', respondido_em = now() where id = p_id;
    raise exception 'Este convite expirou. Peça para a pessoa chamar de novo.';
  end if;
  if p_acao = 'aceitar' then
    update public.jogos_convites set status = 'aceito', respondido_em = now() where id = p_id;
    return query select c.jogo, c.sala;
  elsif p_acao = 'recusar' then
    update public.jogos_convites set status = 'recusado', respondido_em = now() where id = p_id;
  else
    raise exception 'Ação inválida';
  end if;
end $$;

-- ===== 7. Ranking geral de vitórias (solo ou online; partidas no mesmo aparelho não contam) =====
-- p_periodo: semana | mes | sempre
create or replace function public.ranking_geral(p_periodo text default 'sempre')
returns table (nome text, vitorias bigint, partidas bigint, pontos integer)
language sql stable security definer set search_path = public as $$
  select public.nome_curto(p.nome),
         count(*) filter (where j.vitoria is true),
         count(*),
         coalesce((select sum(l.pontos) from public.pontos_lancamentos l where l.usuario_id = p.id), 0)::integer
  from public.jogos_partidas j join public.perfis p on p.id = j.usuario_id
  where auth.uid() is not null and p.ativo and not p.bloqueado
    and (j.modo = 'solo' or (j.detalhes ->> 'online') = 'true')
    and (p_periodo = 'sempre'
         or (p_periodo = 'semana' and j.criado_em > now() - interval '7 days')
         or (p_periodo = 'mes' and j.criado_em > now() - interval '30 days'))
  group by p.id, p.nome
  having count(*) filter (where j.vitoria is true) > 0
  order by 2 desc, 3 asc
  limit 20
$$;

-- ===== 8. Notificações personalizadas =====
alter table public.push_prefs
  add column if not exists eventos_regiao boolean not null default true,
  add column if not exists eventos_interesse boolean not null default true,
  add column if not exists jogos boolean not null default true;

do $$ begin
  if to_regprocedure('public.notificar_push()') is not null then
    drop trigger if exists push_eventos on public.eventos;
    create trigger push_eventos after insert on public.eventos for each row execute function public.notificar_push();
    drop trigger if exists push_jogos_convites on public.jogos_convites;
    create trigger push_jogos_convites after insert on public.jogos_convites for each row execute function public.notificar_push();
    drop trigger if exists push_pontos_cupons on public.pontos_cupons;
    create trigger push_pontos_cupons after insert on public.pontos_cupons for each row execute function public.notificar_push();
  else
    raise notice 'Funcao notificar_push nao existe: crie os webhooks de eventos, jogos_convites e pontos_cupons (veja ATUALIZACAO-CONVERSAS-E-PUSH.md).';
  end if;
end $$;

-- ===== 9. Tempo real e permissões =====
do $$ declare t text; begin
  foreach t in array array['jogos_convites', 'pontos_cupons'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

revoke all on function public.pontos_resumo(), public.validar_cupom_pontos(text, boolean), public.alternar_favorito(text, text),
  public.meus_favoritos(), public.usar_codigo_indicacao(text), public.minhas_indicacoes(), public.exportar_meus_dados(),
  public.excluir_minha_conta(), public.pessoas_para_jogar(), public.convidar_para_jogar(uuid, text), public.ver_convite(uuid),
  public.responder_convite(uuid, text), public.ranking_geral(text) from public, anon;
grant execute on function public.pontos_resumo(), public.validar_cupom_pontos(text, boolean), public.alternar_favorito(text, text),
  public.meus_favoritos(), public.usar_codigo_indicacao(text), public.minhas_indicacoes(), public.exportar_meus_dados(),
  public.excluir_minha_conta(), public.pessoas_para_jogar(), public.convidar_para_jogar(uuid, text), public.ver_convite(uuid),
  public.responder_convite(uuid, text), public.ranking_geral(text) to authenticated;
