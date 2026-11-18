-- ETAPA 3 — Bate-papo: editar e apagar a própria mensagem
-- Rode UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Não altera mensagens_sala nem as regras que já existem.

alter table public.mensagens add column if not exists editado_em timestamptz;
alter table public.mensagens add column if not exists apagada boolean not null default false;

-- Editar: só o autor, só mensagem não apagada, texto de 1 a 1000 caracteres.
create or replace function public.editar_mensagem(p_id uuid, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare t text := btrim(coalesce(p_texto, ''));
begin
  if auth.uid() is null or not usuario_liberado() then raise exception 'sem acesso'; end if;
  if char_length(t) < 1 or char_length(t) > 1000 then raise exception 'texto inválido'; end if;
  update mensagens set texto = t, editado_em = now()
   where id = p_id and autor_id = auth.uid() and apagada = false;
  if not found then raise exception 'mensagem não encontrada'; end if;
end $$;

-- Apagar: só o autor. A mensagem vira um aviso "apagada" (o texto original é removido de verdade).
create or replace function public.apagar_mensagem(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not usuario_liberado() then raise exception 'sem acesso'; end if;
  update mensagens set texto = 'Mensagem apagada', apagada = true, editado_em = null
   where id = p_id and autor_id = auth.uid();
  if not found then raise exception 'mensagem não encontrada'; end if;
end $$;

-- Marcas (editada/apagada) das mensagens de uma sala, só para quem participa dela.
create or replace function public.mensagens_marcas(sl uuid, ids uuid[])
returns table (id uuid, editado_em timestamptz, apagada boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null or not usuario_liberado() then return; end if;
  if not exists (select 1 from minhas_conversas() c where c.sala_id = sl) then return; end if;
  return query select m.id, m.editado_em, m.apagada from mensagens m where m.sala_id = sl and m.id = any(ids);
end $$;

revoke all on function public.editar_mensagem(uuid, text), public.apagar_mensagem(uuid), public.mensagens_marcas(uuid, uuid[]) from public, anon;
grant execute on function public.editar_mensagem(uuid, text), public.apagar_mensagem(uuid), public.mensagens_marcas(uuid, uuid[]) to authenticated;
