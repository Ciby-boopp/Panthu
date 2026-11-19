-- Galeria de fotos do perfil (até 8 fotos por pessoa). Rode UMA vez no SQL Editor do Supabase.
create table if not exists public.perfil_fotos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  url text not null check (char_length(url) < 600 and url like '%/storage/v1/object/public/avatares/%'),
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists perfil_fotos_usuario on public.perfil_fotos (usuario_id, ordem, criado_em);
alter table public.perfil_fotos enable row level security;

drop policy if exists perfil_fotos_dono_ver on public.perfil_fotos;
create policy perfil_fotos_dono_ver on public.perfil_fotos for select to authenticated using (usuario_id = auth.uid());
drop policy if exists perfil_fotos_dono_add on public.perfil_fotos;
create policy perfil_fotos_dono_add on public.perfil_fotos for insert to authenticated with check (usuario_id = auth.uid());
drop policy if exists perfil_fotos_dono_del on public.perfil_fotos;
create policy perfil_fotos_dono_del on public.perfil_fotos for delete to authenticated using (usuario_id = auth.uid());
drop policy if exists perfil_fotos_adm on public.perfil_fotos;
create policy perfil_fotos_adm on public.perfil_fotos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Limite de 8 fotos por pessoa (conferido no servidor)
create or replace function public.perfil_fotos_limite() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.perfil_fotos where usuario_id = new.usuario_id) >= 8 then
    raise exception 'Você já tem 8 fotos na galeria. Apague uma para adicionar outra.';
  end if;
  return new;
end $$;
drop trigger if exists perfil_fotos_limite_tg on public.perfil_fotos;
create trigger perfil_fotos_limite_tg before insert on public.perfil_fotos for each row execute function public.perfil_fotos_limite();

-- Fotos de outra pessoa: só para quem já pode ver o perfil dela (mesma regra de perfil_pessoa).
create or replace function public.fotos_pessoa(p_id uuid)
returns table (id uuid, url text)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.usuario_liberado() then return; end if;
  if not exists (select 1 from public.perfil_pessoa(p_id)) then return; end if;
  return query select f.id, f.url from public.perfil_fotos f where f.usuario_id = p_id order by f.ordem, f.criado_em;
end $$;
revoke all on function public.fotos_pessoa(uuid) from public, anon;
grant execute on function public.fotos_pessoa(uuid) to authenticated;
