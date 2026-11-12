-- Panthu: região do host e avisos de mensagem em tempo real. Rode uma vez no SQL Editor do Supabase (pode repetir sem problema).
alter table public.perfis add column if not exists regiao text;

-- Garante que novas mensagens são enviadas em tempo real (necessário para o aviso no ícone de mensagens).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagens') then
    alter publication supabase_realtime add table public.mensagens;
  end if;
end $$;
