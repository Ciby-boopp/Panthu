-- =====================================================================
-- Panthu — Grupos criados pelas pessoas (nome livre) no bate-papo
-- Rode UMA vez no Supabase (SQL Editor), DEPOIS do busca-grupos.sql. Pode rodar de novo.
-- =====================================================================
alter table public.grupos_tema add column if not exists criador_id uuid references public.perfis(id) on delete set null;
create index if not exists grupos_tema_criador_idx on public.grupos_tema (criador_id);

-- A lista ganha: quem criou e se eu posso excluir (criador ou administrador; os 3 grupos fixos nunca).
drop function if exists public.grupos_lista();
create or replace function public.grupos_lista()
returns table (id uuid, slug text, nome text, descricao text, emoji text, membros bigint, participo boolean, novas bigint, pode_excluir boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not usuario_liberado() then return; end if;
  return query
    select g.id, g.slug, g.nome, g.descricao, g.emoji,
      (select count(*) from grupos_membros m where m.grupo_id = g.id),
      exists (select 1 from grupos_membros m where m.grupo_id = g.id and m.usuario_id = auth.uid()),
      coalesce((select count(*) from grupos_msgs x join grupos_membros me on me.grupo_id = g.id and me.usuario_id = auth.uid()
        where x.grupo_id = g.id and x.autor_id <> auth.uid() and x.criado_em > me.lido_em), 0),
      (g.criador_id is not null and (g.criador_id = auth.uid() or eh_admin()))
    from grupos_tema g where g.ativo
    order by (g.criador_id is not null), g.ordem, g.criado_em desc
    limit 80;
end $$;

-- Qualquer pessoa cria um grupo com o nome que quiser (3 a 40 letras). Limite: 5 grupos por pessoa.
create or replace function public.grupo_criar(p_nome text, p_descricao text default '')
returns text language plpgsql security definer set search_path = public as $$
declare v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g'); v_id uuid; v_slug text;
begin
  if auth.uid() is null or not usuario_liberado() then raise exception 'Não permitido'; end if;
  if char_length(v_nome) < 3 or char_length(v_nome) > 40 then raise exception 'O nome do grupo deve ter de 3 a 40 letras.'; end if;
  if (select count(*) from grupos_tema where criador_id = auth.uid() and ativo) >= 5 then raise exception 'Você já criou 5 grupos. Exclua um para criar outro.'; end if;
  if exists (select 1 from grupos_tema where ativo and norm_texto(nome) = norm_texto(v_nome)) then raise exception 'Já existe um grupo com esse nome.'; end if;
  v_slug := 'g-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into grupos_tema (slug, nome, descricao, emoji, ordem, criador_id)
    values (v_slug, v_nome, left(trim(coalesce(p_descricao, '')), 160), '👥', 100, auth.uid()) returning id into v_id;
  insert into grupos_membros (grupo_id, usuario_id) values (v_id, auth.uid());
  return v_slug;
end $$;

-- Excluir: só quem criou (ou administrador). Os grupos fixos não podem ser excluídos.
create or replace function public.grupo_excluir(p_grupo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  delete from grupos_tema where id = p_grupo and criador_id is not null and (criador_id = auth.uid() or eh_admin());
end $$;

grant execute on function public.grupos_lista(), public.grupo_criar(text, text), public.grupo_excluir(uuid) to authenticated;
revoke execute on function public.grupos_lista(), public.grupo_criar(text, text), public.grupo_excluir(uuid) from anon, public;
