-- Panthu: localização ("Perto de você"), amigos salvos e avaliações de eventos.
-- Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problemas.

-- ===== 0. Colunas novas =====
alter table public.eventos add column if not exists categoria text;
alter table public.estabelecimentos add column if not exists latitude double precision;
alter table public.estabelecimentos add column if not exists longitude double precision;

-- ===== 1. Localização =====
create table if not exists public.localizacoes (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  compartilhar boolean not null default false,
  latitude double precision,
  longitude double precision,
  atualizado_em timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);
alter table public.localizacoes enable row level security;
drop policy if exists loc_propria on public.localizacoes;
create policy loc_propria on public.localizacoes for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create or replace function public.distancia_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(least(1, power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))))
$$;

-- Guarda só uma posição aproximada (2 casas decimais ≈ 1 km), nunca o ponto exato.
create or replace function public.atualizar_localizacao(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'coordenadas inválidas';
  end if;
  insert into public.localizacoes (usuario_id, compartilhar, latitude, longitude, atualizado_em)
  values (auth.uid(), true, round(p_lat::numeric, 2), round(p_lng::numeric, 2), now())
  on conflict (usuario_id) do update
    set compartilhar = true, latitude = excluded.latitude, longitude = excluded.longitude, atualizado_em = now();
end $$;

-- Desligar apaga as coordenadas guardadas.
create or replace function public.parar_compartilhar()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.localizacoes set compartilhar = false, latitude = null, longitude = null, atualizado_em = now()
  where usuario_id = auth.uid();
end $$;

-- Só mostra quem também compartilha, quem atualizou nas últimas 12 h e só devolve distância aproximada (nunca coordenadas).
create or replace function public.pessoas_proximas(p_lat double precision, p_lng double precision, p_raio double precision default 10)
returns table (usuario_id uuid, nome text, foto_url text, distancia_km double precision)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.localizacoes x where x.usuario_id = auth.uid() and x.compartilhar) then return; end if;
  return query
    select l.usuario_id, p.nome, p.foto_url,
           round(public.distancia_km(p_lat, p_lng, l.latitude, l.longitude)::numeric, 1)::double precision
    from public.localizacoes l join public.perfis p on p.id = l.usuario_id
    where l.compartilhar and l.latitude is not null and l.usuario_id <> auth.uid()
      and l.atualizado_em > now() - interval '12 hours'
      and coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)
      and public.distancia_km(p_lat, p_lng, l.latitude, l.longitude) <= least(greatest(p_raio, 1), 100)
    order by 4 limit 50;
end $$;

-- Eventos publicados, de hoje em diante, em locais com latitude/longitude cadastradas.
create or replace function public.eventos_proximos(p_lat double precision, p_lng double precision, p_raio double precision default 10, p_categoria text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by r.inicio), '[]'::jsonb) from (
    select e.id, e.nome, e.inicio, e.categoria, e.banner_url, s.nome as local, s.endereco,
           round(public.distancia_km(p_lat, p_lng, s.latitude, s.longitude)::numeric, 1) as distancia_km,
           (select count(*) from public.confirmacoes c where c.evento_id = e.id and c.status in ('confirmado', 'presente')) as total
    from public.eventos e join public.estabelecimentos s on s.id = e.estabelecimento_id
    where auth.uid() is not null and e.publicado and e.inicio >= now() - interval '4 hours'
      and s.latitude is not null and s.longitude is not null
      and public.distancia_km(p_lat, p_lng, s.latitude, s.longitude) <= least(greatest(p_raio, 1), 200)
      and (p_categoria is null or p_categoria = '' or e.categoria = p_categoria)
    order by e.inicio limit 50
  ) r
$$;

-- ===== 2. Amigos salvos (não é convite nem aceite: a outra pessoa não é avisada nem compartilha nada) =====
create table if not exists public.amigos (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  amigo_id uuid not null references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, amigo_id),
  check (usuario_id <> amigo_id)
);
alter table public.amigos enable row level security;
drop policy if exists amigos_ver on public.amigos;
drop policy if exists amigos_salvar on public.amigos;
drop policy if exists amigos_remover on public.amigos;
create policy amigos_ver on public.amigos for select to authenticated using (usuario_id = auth.uid());
create policy amigos_salvar on public.amigos for insert to authenticated with check (usuario_id = auth.uid());
create policy amigos_remover on public.amigos for delete to authenticated using (usuario_id = auth.uid());

create or replace function public.meus_amigos()
returns table (amigo_id uuid, nome text, foto_url text, criado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select a.amigo_id, p.nome, p.foto_url, a.criado_em
  from public.amigos a join public.perfis p on p.id = a.amigo_id
  where a.usuario_id = auth.uid() and coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)
  order by p.nome
$$;

-- Perfil visível para: você mesmo, quem foi ao mesmo evento, amigos salvos e quem está compartilhando localização agora.
create or replace function public.perfil_pessoa(p_id uuid)
returns table (id uuid, nome text, foto_url text, bio text, sou_eu boolean, mesmo_evento boolean, eh_amigo boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_eu uuid := auth.uid(); v_mesmo boolean; v_amigo boolean; v_loc boolean;
begin
  if v_eu is null then return; end if;
  v_mesmo := exists (select 1 from public.confirmacoes a join public.confirmacoes b on b.evento_id = a.evento_id
    where a.usuario_id = v_eu and b.usuario_id = p_id and a.status in ('confirmado', 'presente') and b.status in ('confirmado', 'presente'));
  v_amigo := exists (select 1 from public.amigos z where z.usuario_id = v_eu and z.amigo_id = p_id);
  v_loc := exists (select 1 from public.localizacoes l where l.usuario_id = p_id and l.compartilhar and l.atualizado_em > now() - interval '12 hours');
  if p_id <> v_eu and not (v_mesmo or v_amigo or v_loc) then return; end if;
  return query
    select p.id, p.nome, p.foto_url, p.bio, (p.id = v_eu), v_mesmo, v_amigo
    from public.perfis p
    where p.id = p_id and (p.id = v_eu or (coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)));
end $$;

-- ===== 3. Avaliações de eventos =====
do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t from pg_attribute where attrelid = 'public.eventos'::regclass and attname = 'id';
  execute format($f$
    create table if not exists public.avaliacoes (
      id bigint generated always as identity primary key,
      evento_id %s not null references public.eventos(id) on delete cascade,
      usuario_id uuid not null references public.perfis(id) on delete cascade,
      nota_geral smallint not null check (nota_geral between 1 and 5),
      organizacao smallint check (organizacao between 1 and 5),
      estrutura smallint check (estrutura between 1 and 5),
      interacao smallint check (interacao between 1 and 5),
      comentario text check (comentario is null or char_length(comentario) <= 1000),
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now(),
      unique (evento_id, usuario_id)
    )$f$, t);
end $$;
alter table public.avaliacoes enable row level security;
drop policy if exists aval_ver on public.avaliacoes;
drop policy if exists aval_enviar on public.avaliacoes;
drop policy if exists aval_editar on public.avaliacoes;
create policy aval_ver on public.avaliacoes for select to authenticated using (
  usuario_id = auth.uid() or exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'admin'));
-- Só avalia quem confirmou presença e só depois que o evento começou.
create policy aval_enviar on public.avaliacoes for insert to authenticated with check (
  usuario_id = auth.uid() and exists (
    select 1 from public.eventos e join public.confirmacoes c on c.evento_id = e.id
    where e.id = avaliacoes.evento_id and c.usuario_id = auth.uid() and c.status in ('confirmado', 'presente') and e.inicio <= now()));
create policy aval_editar on public.avaliacoes for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

grant execute on function public.atualizar_localizacao(double precision, double precision), public.parar_compartilhar(),
  public.pessoas_proximas(double precision, double precision, double precision),
  public.eventos_proximos(double precision, double precision, double precision, text),
  public.meus_amigos(), public.perfil_pessoa(uuid) to authenticated;
