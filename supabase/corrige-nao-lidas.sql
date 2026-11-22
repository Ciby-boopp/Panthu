-- Panthu — corrige o contador de mensagens não lidas.
-- Rode UMA vez no Supabase (SQL Editor). Pode rodar de novo sem problema.

-- Marcar como lida nunca falha por checagem de sala (só mexe na SUA própria marca de leitura).
create or replace function public.marcar_lida(sl uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into chat_leituras (usuario_id, sala_id, lido_em) values (auth.uid(), sl, now())
  on conflict (usuario_id, sala_id) do update set lido_em = now();
end $$;
grant execute on function public.marcar_lida(uuid) to authenticated;

-- Não lidas: só mensagens de OUTRAS pessoas, mais novas que a sua última leitura.
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
grant execute on function public.nao_lidas() to authenticated;
