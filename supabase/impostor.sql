-- ETAPA 6 — Jogo "Quem é o Impostor?"
-- Rode UMA vez no SQL Editor do Supabase (pode rodar de novo sem problema).
-- Segurança: as tabelas do jogo NÃO são lidas pelo app diretamente (RLS ligada, sem permissão para jogadores).
-- Tudo passa por funções que conferem quem é você. Papéis e palavra secreta só saem do servidor para quem tem direito.
-- Só o painel ADM (eh_admin) lê/edita palavras, partidas, denúncias e estatísticas.

-- ===== Tabelas =====
create table if not exists public.imp_categorias (
  id serial primary key,
  nome text not null unique,
  ativa boolean not null default true,
  ordem integer not null default 100
);
create table if not exists public.imp_palavras (
  id serial primary key,
  categoria_id integer not null references public.imp_categorias(id) on delete cascade,
  palavra text not null check (char_length(palavra) between 2 and 40),
  ativa boolean not null default true,
  unique (categoria_id, palavra)
);
create table if not exists public.imp_salas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  publica boolean not null default false,
  anfitriao uuid,
  max_jogadores integer not null default 12 check (max_jogadores between 4 and 20),
  n_impostores integer not null default 1 check (n_impostores between 1 and 3),
  categorias integer[] not null default '{}',
  t_dica integer not null default 25 check (t_dica between 15 and 60),
  t_discussao integer not null default 60 check (t_discussao between 30 and 180),
  t_votacao integer not null default 30 check (t_votacao between 15 and 90),
  estado text not null default 'lobby' check (estado in ('lobby', 'dicas', 'discussao', 'votacao', 'resultado', 'ultima', 'fim')),
  rodada integer not null default 0,
  palavra text,
  usadas integer[] not null default '{}',
  ordem uuid[] not null default '{}',
  vez uuid,
  prazo timestamptz,
  candidatos uuid[],
  revotos integer not null default 0,
  ultimo_resultado jsonb,
  ultimo_eliminado uuid,
  vencedor text,
  chute text,
  chute_ok boolean,
  pontuada boolean not null default false,
  proxima_sala text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.imp_jogadores (
  sala_id uuid not null references public.imp_salas(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  papel text check (papel in ('comum', 'impostor')),
  pronto boolean not null default false,
  vivo boolean not null default true,
  eliminado boolean not null default false,
  saiu boolean not null default false,
  ausente boolean not null default false,
  pontos integer not null default 0,
  entrou_em timestamptz not null default now(),
  ultimo_visto timestamptz not null default now(),
  primary key (sala_id, usuario_id)
);
create index if not exists imp_jog_usuario on public.imp_jogadores (usuario_id);
create table if not exists public.imp_dicas (
  id bigint generated always as identity primary key,
  sala_id uuid not null references public.imp_salas(id) on delete cascade,
  rodada integer not null,
  usuario_id uuid not null,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists imp_dicas_sala on public.imp_dicas (sala_id, id);
create table if not exists public.imp_votos (
  sala_id uuid not null references public.imp_salas(id) on delete cascade,
  rodada integer not null,
  volta integer not null default 0,
  votante uuid not null,
  alvo uuid not null,
  criado_em timestamptz not null default now(),
  primary key (sala_id, rodada, volta, votante)   -- impede voto duplicado
);
create table if not exists public.imp_msgs (
  id bigint generated always as identity primary key,
  sala_id uuid not null references public.imp_salas(id) on delete cascade,
  usuario_id uuid not null,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists imp_msgs_sala on public.imp_msgs (sala_id, id);
create table if not exists public.imp_denuncias (
  id bigint generated always as identity primary key,
  sala_id uuid references public.imp_salas(id) on delete set null,
  codigo text,
  denunciante uuid not null,
  alvo uuid not null,
  motivo text not null,
  resolvida boolean not null default false,
  criado_em timestamptz not null default now()
);
create table if not exists public.imp_stats (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  partidas integer not null default 0,
  vit_impostor integer not null default 0,
  vit_comum integer not null default 0,
  votos_certos integer not null default 0,
  votos_total integer not null default 0,
  pontos integer not null default 0,
  seq_atual integer not null default 0,
  melhor_seq integer not null default 0,
  atualizado_em timestamptz not null default now()
);
create table if not exists public.imp_historico (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  sala_codigo text,
  papel text,
  venceu boolean,
  pontos integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists imp_hist_usuario on public.imp_historico (usuario_id, id desc);
create table if not exists public.imp_convites (
  id bigint generated always as identity primary key,
  de uuid not null references public.perfis(id) on delete cascade,
  para uuid not null references public.perfis(id) on delete cascade,
  codigo text not null,
  sala_nome text,
  criado_em timestamptz not null default now()
);
create index if not exists imp_conv_para on public.imp_convites (para, id desc);

-- ===== Permissões (RLS) =====
alter table public.imp_categorias enable row level security;
alter table public.imp_palavras enable row level security;
alter table public.imp_salas enable row level security;
alter table public.imp_jogadores enable row level security;
alter table public.imp_dicas enable row level security;
alter table public.imp_votos enable row level security;
alter table public.imp_msgs enable row level security;
alter table public.imp_denuncias enable row level security;
alter table public.imp_stats enable row level security;
alter table public.imp_historico enable row level security;
alter table public.imp_convites enable row level security;
do $$ declare t text; begin
  foreach t in array array['imp_categorias', 'imp_palavras', 'imp_salas', 'imp_jogadores', 'imp_dicas', 'imp_votos', 'imp_msgs', 'imp_denuncias', 'imp_stats', 'imp_historico'] loop
    execute format('drop policy if exists %I on public.%I', t || '_adm', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t || '_adm', t);
  end loop;
end $$;
drop policy if exists imp_convites_ver on public.imp_convites;
create policy imp_convites_ver on public.imp_convites for select to authenticated using (para = auth.uid() or de = auth.uid());
drop policy if exists imp_convites_adm on public.imp_convites;
create policy imp_convites_adm on public.imp_convites for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Aviso em tempo real de convite (toast no app)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'imp_convites') then
    alter publication supabase_realtime add table public.imp_convites;
  end if;
end $$;

-- ===== Pontos do app (aparecem em "Meus pontos") =====
do $$ begin
  if to_regclass('public.pontos_regras') is not null then
    insert into public.pontos_regras (codigo, nome, descricao, pontos, limite_dia, unico, ordem) values
      ('impostor_vitoria', 'Vencer no Quem é o Impostor?', 'Vencer uma partida de Quem é o Impostor? (até 10 por dia contam).', 3, 10, false, 90),
      ('impostor_participar', 'Jogar Quem é o Impostor?', 'Chegar ao fim de uma partida de Quem é o Impostor? (até 5 por dia contam).', 1, 5, false, 95)
    on conflict (codigo) do nothing;
  end if;
end $$;

-- ===== Palavras iniciais (o ADM edita depois) =====
insert into public.imp_categorias (nome, ordem) values
  ('Animais', 10), ('Comidas', 20), ('Filmes e séries', 30), ('Lugares', 40), ('Profissões', 50), ('Objetos', 60), ('Esportes', 70),
  ('Celebridades', 80), ('Marcas', 90), ('Internet e redes sociais', 100), ('Música', 110), ('Relacionamentos', 120), ('Cotidiano', 130), ('Aleatório', 140)
on conflict (nome) do nothing;
insert into public.imp_palavras (categoria_id, palavra)
select c.id, p from (values
  ('Animais', 'Cachorro'), ('Animais', 'Gato'), ('Animais', 'Elefante'), ('Animais', 'Girafa'), ('Animais', 'Tubarão'), ('Animais', 'Papagaio'), ('Animais', 'Tartaruga'), ('Animais', 'Macaco'), ('Animais', 'Cavalo'), ('Animais', 'Pinguim'), ('Animais', 'Jacaré'), ('Animais', 'Borboleta'), ('Animais', 'Coruja'), ('Animais', 'Camelo'),
  ('Comidas', 'Pizza'), ('Comidas', 'Feijoada'), ('Comidas', 'Brigadeiro'), ('Comidas', 'Pastel'), ('Comidas', 'Sushi'), ('Comidas', 'Hambúrguer'), ('Comidas', 'Coxinha'), ('Comidas', 'Lasanha'), ('Comidas', 'Pão de queijo'), ('Comidas', 'Churrasco'), ('Comidas', 'Sorvete'), ('Comidas', 'Tapioca'), ('Comidas', 'Açaí'), ('Comidas', 'Macarrão'),
  ('Filmes e séries', 'Titanic'), ('Filmes e séries', 'Harry Potter'), ('Filmes e séries', 'Tropa de Elite'), ('Filmes e séries', 'Frozen'), ('Filmes e séries', 'Matrix'), ('Filmes e séries', 'Todo Mundo Odeia o Cris'), ('Filmes e séries', 'Stranger Things'), ('Filmes e séries', 'O Rei Leão'), ('Filmes e séries', 'Vingadores'), ('Filmes e séries', 'Cidade de Deus'), ('Filmes e séries', 'Toy Story'), ('Filmes e séries', 'Round 6'), ('Filmes e séries', 'Chaves'), ('Filmes e séries', 'Shrek'),
  ('Lugares', 'Praia'), ('Lugares', 'Shopping'), ('Lugares', 'Aeroporto'), ('Lugares', 'Hospital'), ('Lugares', 'Cinema'), ('Lugares', 'Biblioteca'), ('Lugares', 'Estádio'), ('Lugares', 'Rodoviária'), ('Lugares', 'Padaria'), ('Lugares', 'Cachoeira'), ('Lugares', 'Igreja'), ('Lugares', 'Parque de diversões'), ('Lugares', 'Fazenda'), ('Lugares', 'Escola'),
  ('Profissões', 'Médico'), ('Profissões', 'Professor'), ('Profissões', 'Bombeiro'), ('Profissões', 'Motorista'), ('Profissões', 'Cozinheiro'), ('Profissões', 'Advogado'), ('Profissões', 'Dentista'), ('Profissões', 'Padeiro'), ('Profissões', 'Policial'), ('Profissões', 'Cabeleireiro'), ('Profissões', 'Engenheiro'), ('Profissões', 'Jornalista'), ('Profissões', 'Piloto'), ('Profissões', 'Veterinário'),
  ('Objetos', 'Guarda-chuva'), ('Objetos', 'Celular'), ('Objetos', 'Chave'), ('Objetos', 'Óculos'), ('Objetos', 'Travesseiro'), ('Objetos', 'Espelho'), ('Objetos', 'Mochila'), ('Objetos', 'Relógio'), ('Objetos', 'Escova de dentes'), ('Objetos', 'Controle remoto'), ('Objetos', 'Tesoura'), ('Objetos', 'Panela de pressão'), ('Objetos', 'Ventilador'), ('Objetos', 'Carteira'),
  ('Esportes', 'Futebol'), ('Esportes', 'Vôlei'), ('Esportes', 'Natação'), ('Esportes', 'Basquete'), ('Esportes', 'Tênis'), ('Esportes', 'Judô'), ('Esportes', 'Surfe'), ('Esportes', 'Ciclismo'), ('Esportes', 'Xadrez'), ('Esportes', 'Corrida'), ('Esportes', 'Skate'), ('Esportes', 'Handebol'), ('Esportes', 'Boxe'), ('Esportes', 'Capoeira'),
  ('Celebridades', 'Pelé'), ('Celebridades', 'Xuxa'), ('Celebridades', 'Ayrton Senna'), ('Celebridades', 'Silvio Santos'), ('Celebridades', 'Anitta'), ('Celebridades', 'Neymar'), ('Celebridades', 'Gisele Bündchen'), ('Celebridades', 'Roberto Carlos'), ('Celebridades', 'Ivete Sangalo'), ('Celebridades', 'Fernanda Montenegro'), ('Celebridades', 'Chico Buarque'), ('Celebridades', 'Ronaldo Fenômeno'), ('Celebridades', 'Tom Hanks'), ('Celebridades', 'Michael Jackson'),
  ('Marcas', 'Coca-Cola'), ('Marcas', 'Nike'), ('Marcas', 'Apple'), ('Marcas', 'Havaianas'), ('Marcas', 'McDonald''s'), ('Marcas', 'Netflix'), ('Marcas', 'Samsung'), ('Marcas', 'Natura'), ('Marcas', 'Nubank'), ('Marcas', 'Toyota'), ('Marcas', 'Adidas'), ('Marcas', 'Google'), ('Marcas', 'Ferrari'), ('Marcas', 'Nestlé'),
  ('Internet e redes sociais', 'Instagram'), ('Internet e redes sociais', 'WhatsApp'), ('Internet e redes sociais', 'TikTok'), ('Internet e redes sociais', 'YouTube'), ('Internet e redes sociais', 'Meme'), ('Internet e redes sociais', 'Emoji'), ('Internet e redes sociais', 'Influenciador'), ('Internet e redes sociais', 'Selfie'), ('Internet e redes sociais', 'Hashtag'), ('Internet e redes sociais', 'Wi-Fi'), ('Internet e redes sociais', 'Live'), ('Internet e redes sociais', 'Podcast'), ('Internet e redes sociais', 'Story'), ('Internet e redes sociais', 'Streaming'),
  ('Música', 'Violão'), ('Música', 'Samba'), ('Música', 'Forró'), ('Música', 'Bateria'), ('Música', 'Sertanejo'), ('Música', 'Rock in Rio'), ('Música', 'Karaokê'), ('Música', 'Funk'), ('Música', 'Piano'), ('Música', 'Pagode'), ('Música', 'Show'), ('Música', 'Fone de ouvido'), ('Música', 'Maestro'), ('Música', 'Carnaval'),
  ('Relacionamentos', 'Primeiro encontro'), ('Relacionamentos', 'Casamento'), ('Relacionamentos', 'Ciúmes'), ('Relacionamentos', 'Amizade'), ('Relacionamentos', 'Sogra'), ('Relacionamentos', 'Pedido de namoro'), ('Relacionamentos', 'Abraço'), ('Relacionamentos', 'Paquera'), ('Relacionamentos', 'Cunhado'), ('Relacionamentos', 'Aniversário'), ('Relacionamentos', 'Saudade'), ('Relacionamentos', 'Presente'), ('Relacionamentos', 'Ex'), ('Relacionamentos', 'Melhor amigo'),
  ('Cotidiano', 'Café da manhã'), ('Cotidiano', 'Trânsito'), ('Cotidiano', 'Banho'), ('Cotidiano', 'Mercado'), ('Cotidiano', 'Fila do banco'), ('Cotidiano', 'Despertador'), ('Cotidiano', 'Domingo'), ('Cotidiano', 'Ônibus lotado'), ('Cotidiano', 'Lavar louça'), ('Cotidiano', 'Segunda-feira'), ('Cotidiano', 'Soneca'), ('Cotidiano', 'Churrasco de domingo'), ('Cotidiano', 'Conta de luz'), ('Cotidiano', 'Faxina'),
  ('Aleatório', 'Dinossauro'), ('Aleatório', 'Foguete'), ('Aleatório', 'Pirata'), ('Aleatório', 'Arco-íris'), ('Aleatório', 'Tesouro'), ('Aleatório', 'Fantasma'), ('Aleatório', 'Vulcão'), ('Aleatório', 'Robô'), ('Aleatório', 'Balão'), ('Aleatório', 'Circo'), ('Aleatório', 'Castelo'), ('Aleatório', 'Ilha deserta'), ('Aleatório', 'Neve'), ('Aleatório', 'Palhaço')
) v(cat, p) join public.imp_categorias c on c.nome = v.cat
on conflict (categoria_id, palavra) do nothing;

-- ===== Funções internas (não chamáveis pelo app) =====
create or replace function public.imp_norm(t text) returns text language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(t, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]', '', 'g')
$$;

-- Escolhe quem fala agora: o primeiro da ordem (a partir de p_de) que está vivo, presente e não saiu.
create or replace function public.imp_proxima_vez(p_sala uuid, p_de integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ordem uuid[]; i integer; v_u uuid;
begin
  select ordem into v_ordem from imp_salas where id = p_sala;
  for i in greatest(p_de, 1) .. coalesce(array_length(v_ordem, 1), 0) loop
    v_u := v_ordem[i];
    if exists (select 1 from imp_jogadores where sala_id = p_sala and usuario_id = v_u and vivo and not saiu and not ausente) then return v_u; end if;
  end loop;
  return null;
end $$;

-- Fecha a partida sem vencedor (sala vazia, gente de menos…): ninguém ganha pontos.
create or replace function public.imp_cancelar(p_sala uuid)
returns void language sql security definer set search_path = public as $$
  update imp_salas set estado = 'fim', vencedor = 'cancelada', pontuada = true, prazo = null, atualizado_em = now() where id = p_sala and estado <> 'fim';
$$;

-- Encerra, calcula os pontos (uma única vez) e atualiza estatísticas.
create or replace function public.imp_finalizar(p_sala uuid, p_vencedor text)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; j imp_jogadores%rowtype; v_pts integer; v_certos integer; v_total integer; v_venceu boolean; v_part boolean;
begin
  select * into s from imp_salas where id = p_sala for update;
  if not found or s.pontuada then return; end if;
  for j in select * from imp_jogadores where sala_id = s.id loop
    v_part := not j.saiu and not j.ausente;
    v_pts := 0;
    v_venceu := not j.saiu and ((j.papel = 'impostor' and p_vencedor = 'impostores') or (j.papel = 'comum' and p_vencedor = 'comuns'));
    if v_part then v_pts := v_pts + 20; end if;                                           -- participa até o final
    if v_venceu and j.papel = 'impostor' then v_pts := v_pts + 150; end if;                -- impostor vence
    if v_venceu and j.papel = 'comum' then v_pts := v_pts + 100; end if;                   -- comum vence
    select count(*) filter (where a.papel = 'impostor'), count(*) into v_certos, v_total
      from imp_votos v left join imp_jogadores a on a.sala_id = v.sala_id and a.usuario_id = v.alvo
      where v.sala_id = s.id and v.votante = j.usuario_id;
    v_pts := v_pts + 30 * coalesce(v_certos, 0);                                           -- voto certo
    if s.chute_ok and j.usuario_id = s.ultimo_eliminado and j.papel = 'impostor' then v_pts := v_pts + 50; end if; -- última chance
    update imp_jogadores set pontos = v_pts where sala_id = s.id and usuario_id = j.usuario_id;
    insert into imp_stats as st (usuario_id, partidas, vit_impostor, vit_comum, votos_certos, votos_total, pontos, seq_atual, melhor_seq)
      values (j.usuario_id, 1, (v_venceu and j.papel = 'impostor')::int, (v_venceu and j.papel = 'comum')::int, coalesce(v_certos, 0), coalesce(v_total, 0), v_pts, v_venceu::int, v_venceu::int)
      on conflict (usuario_id) do update set
        partidas = st.partidas + 1,
        vit_impostor = st.vit_impostor + (v_venceu and j.papel = 'impostor')::int,
        vit_comum = st.vit_comum + (v_venceu and j.papel = 'comum')::int,
        votos_certos = st.votos_certos + coalesce(v_certos, 0),
        votos_total = st.votos_total + coalesce(v_total, 0),
        pontos = st.pontos + v_pts,
        seq_atual = case when v_venceu then st.seq_atual + 1 else 0 end,
        melhor_seq = greatest(st.melhor_seq, case when v_venceu then st.seq_atual + 1 else 0 end),
        atualizado_em = now();
    insert into imp_historico (usuario_id, sala_codigo, papel, venceu, pontos) values (j.usuario_id, s.codigo, j.papel, v_venceu, v_pts);
    if v_part then
      begin
        perform public.dar_pontos(j.usuario_id, case when v_venceu then 'impostor_vitoria' else 'impostor_participar' end, s.id::text);
      exception when others then null;   -- o jogo não pode quebrar se o sistema de pontos do app não estiver instalado
      end;
    end if;
  end loop;
  update imp_salas set estado = 'fim', vencedor = p_vencedor, pontuada = true, prazo = null, atualizado_em = now() where id = s.id;
end $$;

-- Confere se a partida já tem vencedor ou se acabou por falta de gente. Retorna true se encerrou.
create or replace function public.imp_checar_fim(p_sala uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_ativos integer; v_i integer; v_c integer;
begin
  select * into s from imp_salas where id = p_sala for update;
  if not found or s.estado in ('lobby', 'fim', 'ultima') then return false; end if;
  select count(*) into v_ativos from imp_jogadores where sala_id = s.id and not saiu;
  if v_ativos < 3 then perform imp_cancelar(s.id); return true; end if;
  select count(*) filter (where papel = 'impostor'), count(*) filter (where papel = 'comum') into v_i, v_c
    from imp_jogadores where sala_id = s.id and vivo and not saiu;
  if v_i = 0 then perform imp_finalizar(s.id, 'comuns'); return true; end if;
  if v_i >= v_c then perform imp_finalizar(s.id, 'impostores'); return true; end if;
  return false;
end $$;

-- Começa a rodada de dicas (rodada atual já definida).
create or replace function public.imp_comecar_dicas(p_sala uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_vez uuid;
begin
  select * into s from imp_salas where id = p_sala for update;
  v_vez := imp_proxima_vez(s.id, 1);
  if v_vez is null then
    update imp_salas set estado = 'discussao', vez = null, prazo = now() + make_interval(secs => t_discussao), atualizado_em = now() where id = s.id;
  else
    update imp_salas set estado = 'dicas', vez = v_vez, prazo = now() + make_interval(secs => t_dica), revotos = 0, candidatos = null, atualizado_em = now() where id = s.id;
  end if;
end $$;

-- Passa a vez para o próximo (ou abre a discussão quando todos já deram dica).
create or replace function public.imp_avancar_vez(p_sala uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_idx integer; v_prox uuid;
begin
  select * into s from imp_salas where id = p_sala for update;
  v_idx := coalesce(array_position(s.ordem, s.vez), 0);
  v_prox := imp_proxima_vez(s.id, v_idx + 1);
  if v_prox is null then
    update imp_salas set estado = 'discussao', vez = null, prazo = now() + make_interval(secs => t_discussao), atualizado_em = now() where id = s.id;
  else
    update imp_salas set vez = v_prox, prazo = now() + make_interval(secs => t_dica), atualizado_em = now() where id = s.id;
  end if;
end $$;

-- Conta os votos. Empate → nova votação só entre os mais votados (uma vez); persistindo, ninguém sai.
create or replace function public.imp_apurar(p_sala uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_topo uuid[]; v_votos jsonb; v_elim uuid; v_papel text; v_i integer; v_c integer; v_res jsonb;
begin
  select * into s from imp_salas where id = p_sala for update;
  if not found or s.estado <> 'votacao' then return; end if;
  select coalesce(jsonb_agg(jsonb_build_object('de', votante, 'para', alvo)), '[]'::jsonb) into v_votos
    from imp_votos where sala_id = s.id and rodada = s.rodada and volta = s.revotos;
  select array_agg(alvo) into v_topo from (
    select alvo, count(*) n, max(count(*)) over () mx from imp_votos where sala_id = s.id and rodada = s.rodada and volta = s.revotos group by alvo
  ) q where n = mx;
  if v_topo is not null and array_length(v_topo, 1) > 1 and s.revotos < 1 then
    update imp_salas set revotos = revotos + 1, candidatos = v_topo, prazo = now() + make_interval(secs => t_votacao),
      ultimo_resultado = jsonb_build_object('tipo', 'revote', 'candidatos', to_jsonb(v_topo), 'votos', v_votos), atualizado_em = now() where id = s.id;
    return;
  end if;
  if v_topo is not null and array_length(v_topo, 1) = 1 then v_elim := v_topo[1]; end if;
  if v_elim is not null then
    update imp_jogadores set vivo = false, eliminado = true where sala_id = s.id and usuario_id = v_elim;
    select papel into v_papel from imp_jogadores where sala_id = s.id and usuario_id = v_elim;
    v_res := jsonb_build_object('tipo', 'eliminado', 'eliminado', v_elim, 'era_impostor', v_papel = 'impostor', 'votos', v_votos);
  else
    v_res := jsonb_build_object('tipo', 'ninguem', 'votos', v_votos);
  end if;
  update imp_salas set ultimo_resultado = v_res, ultimo_eliminado = v_elim, candidatos = null, atualizado_em = now() where id = s.id;
  select count(*) filter (where papel = 'impostor'), count(*) filter (where papel = 'comum') into v_i, v_c
    from imp_jogadores where sala_id = s.id and vivo and not saiu;
  if v_i = 0 then
    -- impostores descobertos: o último eliminado tem uma chance de adivinhar a palavra (se ainda estiver na sala)
    if v_elim is not null and v_papel = 'impostor' and exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = v_elim and not saiu and not ausente) then
      update imp_salas set estado = 'ultima', prazo = now() + interval '25 seconds', atualizado_em = now() where id = s.id;
    else
      perform imp_finalizar(s.id, 'comuns');
    end if;
  elsif v_i >= v_c then
    perform imp_finalizar(s.id, 'impostores');
  else
    update imp_salas set estado = 'resultado', prazo = now() + interval '8 seconds', atualizado_em = now() where id = s.id;
  end if;
end $$;

-- Relógio do jogo: roda quando alguém consulta a sala. Avança fases vencidas e trata quem sumiu.
create or replace function public.imp_tick(p_sala uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype;
begin
  select * into s from imp_salas where id = p_sala for update skip locked;
  if not found or s.estado = 'fim' then return; end if;
  if s.estado = 'lobby' then
    delete from imp_jogadores where sala_id = s.id and ultimo_visto < now() - interval '90 seconds';
    if not exists (select 1 from imp_jogadores where sala_id = s.id) then perform imp_cancelar(s.id); return; end if;
    if not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = s.anfitriao) then
      update imp_salas set anfitriao = (select usuario_id from imp_jogadores where sala_id = s.id order by entrou_em limit 1), atualizado_em = now() where id = s.id;
    end if;
    return;
  end if;
  update imp_jogadores set ausente = true where sala_id = s.id and not saiu and not ausente and ultimo_visto < now() - interval '45 seconds';
  if imp_checar_fim(s.id) then return; end if;
  select * into s from imp_salas where id = p_sala;
  if s.prazo is null or now() < s.prazo then
    -- vez de quem ficou ausente: pula na hora
    if s.estado = 'dicas' and not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = s.vez and vivo and not saiu and not ausente) then
      insert into imp_dicas (sala_id, rodada, usuario_id, texto) values (s.id, s.rodada, s.vez, '(ausente)');
      perform imp_avancar_vez(s.id);
    end if;
    return;
  end if;
  if s.estado = 'dicas' then
    insert into imp_dicas (sala_id, rodada, usuario_id, texto) values (s.id, s.rodada, s.vez, '(sem dica)');
    perform imp_avancar_vez(s.id);
  elsif s.estado = 'discussao' then
    update imp_salas set estado = 'votacao', revotos = 0, candidatos = null, prazo = now() + make_interval(secs => t_votacao), atualizado_em = now() where id = s.id;
  elsif s.estado = 'votacao' then
    perform imp_apurar(s.id);
  elsif s.estado = 'resultado' then
    update imp_salas set rodada = rodada + 1, atualizado_em = now() where id = s.id;
    perform imp_comecar_dicas(s.id);
  elsif s.estado = 'ultima' then
    perform imp_finalizar(s.id, 'comuns');
  end if;
end $$;

-- Tira a pessoa da sala (lobby: sai da lista; em jogo: conta como abandono).
create or replace function public.imp_sair_interno(p_sala uuid, p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype;
begin
  select * into s from imp_salas where id = p_sala for update;
  if not found or s.estado = 'fim' then return; end if;
  if s.estado = 'lobby' then
    delete from imp_jogadores where sala_id = s.id and usuario_id = p_uid;
    if not exists (select 1 from imp_jogadores where sala_id = s.id) then perform imp_cancelar(s.id); return; end if;
    if s.anfitriao = p_uid then
      update imp_salas set anfitriao = (select usuario_id from imp_jogadores where sala_id = s.id order by entrou_em limit 1), atualizado_em = now() where id = s.id;
    end if;
  else
    update imp_jogadores set saiu = true, vivo = false where sala_id = s.id and usuario_id = p_uid;
    perform imp_checar_fim(s.id);
  end if;
end $$;

-- Quem ficou sumido há mais de 2 min em outra sala é retirado dela (para poder entrar em outra).
create or replace function public.imp_limpar_antigas(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select j.sala_id from imp_jogadores j join imp_salas s on s.id = j.sala_id
           where j.usuario_id = p_uid and not j.saiu and s.estado <> 'fim' and j.ultimo_visto < now() - interval '120 seconds' loop
    perform imp_sair_interno(r.sala_id, p_uid);
  end loop;
end $$;

create or replace function public.imp_codigo_novo()
returns text language plpgsql as $$
declare c text; i integer; letras text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  loop
    c := '';
    for i in 1 .. 6 loop c := c || substr(letras, 1 + floor(random() * length(letras))::int, 1); end loop;
    exit when not exists (select 1 from imp_salas where codigo = c);
  end loop;
  return c;
end $$;

-- ===== Funções chamadas pelo app =====
create or replace function public.imp_sala_atual()
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_c text;
begin
  if v_uid is null then return null; end if;
  perform imp_limpar_antigas(v_uid);
  select s.codigo into v_c from imp_jogadores j join imp_salas s on s.id = j.sala_id
    where j.usuario_id = v_uid and not j.saiu and s.estado <> 'fim' order by s.criado_em desc limit 1;
  return v_c;
end $$;

create or replace function public.imp_categorias_lista()
returns table (id integer, nome text, total bigint)
language sql stable security definer set search_path = public as $$
  select c.id, c.nome, count(p.id) from imp_categorias c join imp_palavras p on p.categoria_id = c.id and p.ativa
  where c.ativa and public.usuario_liberado() group by c.id, c.nome, c.ordem order by c.ordem, c.nome
$$;

create or replace function public.imp_criar_sala(p_nome text, p_publica boolean, p_max integer, p_imp integer, p_cats integer[], p_tdica integer, p_tdisc integer, p_tvot integer)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cod text; v_id uuid; v_nome text := btrim(coalesce(p_nome, '')); v_max integer := coalesce(p_max, 12); v_imp integer := coalesce(p_imp, 1);
begin
  if v_uid is null or not usuario_liberado() then raise exception 'Sem acesso'; end if;
  if imp_sala_atual() is not null then raise exception 'Você já está em uma sala. Volte para ela ou saia antes de criar outra.'; end if;
  if v_max < 4 or v_max > 20 then raise exception 'A sala aceita de 4 a 20 jogadores.'; end if;
  if v_imp < 1 or v_imp > 3 or v_imp > greatest(1, (v_max - 1) / 2) then raise exception 'Quantidade de impostores incompatível com o número de jogadores.'; end if;
  if v_nome = '' then select 'Sala de ' || split_part(nome, ' ', 1) into v_nome from perfis where id = v_uid; end if;
  v_nome := left(v_nome, 40);
  if (select count(*) from imp_salas where anfitriao = v_uid and criado_em > now() - interval '1 hour') >= 10 then raise exception 'Muitas salas criadas em pouco tempo. Aguarde um pouco.'; end if;
  v_cod := imp_codigo_novo();
  insert into imp_salas (codigo, nome, publica, anfitriao, max_jogadores, n_impostores, categorias, t_dica, t_discussao, t_votacao)
    values (v_cod, v_nome, coalesce(p_publica, false), v_uid, v_max, v_imp, coalesce(p_cats, '{}'),
            least(60, greatest(15, coalesce(p_tdica, 25))), least(180, greatest(30, coalesce(p_tdisc, 60))), least(90, greatest(15, coalesce(p_tvot, 30))))
    returning id into v_id;
  insert into imp_jogadores (sala_id, usuario_id, pronto) values (v_id, v_uid, true);
  return v_cod;
end $$;

create or replace function public.imp_entrar(p_codigo text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); s imp_salas%rowtype; v_atual text; v_n integer;
begin
  if v_uid is null or not usuario_liberado() then raise exception 'Sem acesso'; end if;
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, ''))) for update;
  if not found or s.estado = 'fim' then raise exception 'Sala não encontrada ou já encerrada.'; end if;
  -- já está nela (reconexão)
  if exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = v_uid and not saiu) then return s.codigo; end if;
  v_atual := imp_sala_atual();
  if v_atual is not null and v_atual <> s.codigo then raise exception 'Você já está em outra sala. Saia dela antes de entrar nesta.'; end if;
  if s.estado <> 'lobby' then raise exception 'A partida já começou. Entre na próxima!'; end if;
  select count(*) into v_n from imp_jogadores where sala_id = s.id;
  if v_n >= s.max_jogadores then raise exception 'A sala está cheia.'; end if;
  insert into imp_jogadores (sala_id, usuario_id, pronto) values (s.id, v_uid, false)
    on conflict (sala_id, usuario_id) do update set saiu = false, ausente = false, ultimo_visto = now();
  update imp_salas set atualizado_em = now() where id = s.id;
  return s.codigo;
end $$;

create or replace function public.imp_salas_publicas()
returns table (codigo text, nome text, anfitriao_nome text, jogadores bigint, max_jogadores integer)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not usuario_liberado() then return; end if;
  -- limpeza: salas sem sinal de vida há muito tempo são encerradas; as muito antigas são apagadas
  update imp_salas s set estado = 'fim', vencedor = 'cancelada', pontuada = true, prazo = null
    where s.estado <> 'fim' and not exists (select 1 from imp_jogadores j where j.sala_id = s.id and j.ultimo_visto > now() - interval '15 minutes');
  delete from imp_salas where criado_em < now() - interval '30 days';
  return query
    select s.codigo, s.nome, p.nome, (select count(*) from imp_jogadores j where j.sala_id = s.id), s.max_jogadores
    from imp_salas s left join perfis p on p.id = s.anfitriao
    where s.publica and s.estado = 'lobby'
      and exists (select 1 from imp_jogadores j where j.sala_id = s.id and j.ultimo_visto > now() - interval '60 seconds')
      and (select count(*) from imp_jogadores j where j.sala_id = s.id) < s.max_jogadores
    order by 4 desc, s.criado_em desc limit 30;
end $$;

create or replace function public.imp_jogar_agora()
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cod text; v_nome text;
begin
  if v_uid is null or not usuario_liberado() then raise exception 'Sem acesso'; end if;
  v_cod := imp_sala_atual();
  if v_cod is not null then return v_cod; end if;
  select s.codigo into v_cod from imp_salas s
    where s.publica and s.estado = 'lobby'
      and exists (select 1 from imp_jogadores j where j.sala_id = s.id and j.ultimo_visto > now() - interval '60 seconds')
      and (select count(*) from imp_jogadores j where j.sala_id = s.id) < s.max_jogadores
    order by (select count(*) from imp_jogadores j where j.sala_id = s.id) desc, s.criado_em limit 1;
  if v_cod is not null then
    begin return imp_entrar(v_cod); exception when others then null; end;
  end if;
  return imp_criar_sala(null, true, 12, 1, '{}', 25, 60, 30);
end $$;

create or replace function public.imp_pronto(p_codigo text, p_pronto boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update imp_jogadores j set pronto = coalesce(p_pronto, false)
    from imp_salas s where s.id = j.sala_id and s.codigo = upper(p_codigo) and s.estado = 'lobby' and j.usuario_id = auth.uid();
end $$;

create or replace function public.imp_sair(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from imp_salas where codigo = upper(btrim(coalesce(p_codigo, '')));
  if v_id is not null and auth.uid() is not null then perform imp_sair_interno(v_id, auth.uid()); end if;
end $$;

create or replace function public.imp_iniciar(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_n integer; v_imp integer; v_pid integer; v_pal text;
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, ''))) for update;
  if not found or s.anfitriao is distinct from auth.uid() then raise exception 'Só o anfitrião pode iniciar.'; end if;
  if s.estado <> 'lobby' then raise exception 'A partida já começou.'; end if;
  select count(*) into v_n from imp_jogadores where sala_id = s.id;
  if v_n < 4 then raise exception 'São necessários pelo menos 4 jogadores.'; end if;
  if exists (select 1 from imp_jogadores where sala_id = s.id and not pronto and usuario_id <> s.anfitriao) then raise exception 'Nem todos estão prontos.'; end if;
  -- palavra: sorteia nas categorias escolhidas, evitando repetir as já usadas nesta sala
  for i in 1 .. 2 loop
    select p.id, p.palavra into v_pid, v_pal from imp_palavras p join imp_categorias c on c.id = p.categoria_id
      where p.ativa and c.ativa and (cardinality(s.categorias) = 0 or c.id = any (s.categorias)) and p.id <> all (s.usadas)
      order by random() limit 1;
    exit when v_pid is not null;
    s.usadas := '{}';
  end loop;
  if v_pid is null then raise exception 'Não há palavras cadastradas nas categorias escolhidas.'; end if;
  -- papéis: sorteio feito aqui, no servidor, e gravado em tabela que o app não consegue ler
  v_imp := least(s.n_impostores, greatest(1, (v_n - 1) / 2));
  delete from imp_dicas where sala_id = s.id; delete from imp_votos where sala_id = s.id; delete from imp_msgs where sala_id = s.id;
  update imp_jogadores set papel = 'comum', vivo = true, eliminado = false, saiu = false, ausente = false, pontos = 0, ultimo_visto = now() where sala_id = s.id;
  update imp_jogadores set papel = 'impostor' where sala_id = s.id and usuario_id in (select usuario_id from imp_jogadores where sala_id = s.id order by random() limit v_imp);
  update imp_salas set palavra = v_pal, usadas = array_append(s.usadas, v_pid), rodada = 1, revotos = 0, candidatos = null, ultimo_resultado = null, ultimo_eliminado = null,
    chute = null, chute_ok = null, vencedor = null, pontuada = false,
    ordem = array(select usuario_id from imp_jogadores where sala_id = s.id order by random()), atualizado_em = now()
    where id = s.id;
  perform imp_comecar_dicas(s.id);
end $$;

create or replace function public.imp_dica(p_codigo text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_t text := btrim(coalesce(p_texto, '')); v_papel text;
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, ''))) for update;
  if not found or s.estado <> 'dicas' or s.vez is distinct from auth.uid() then raise exception 'Não é a sua vez de dar a dica.'; end if;
  if char_length(v_t) < 1 or char_length(v_t) > 40 then raise exception 'A dica deve ter de 1 a 40 caracteres.'; end if;
  select papel into v_papel from imp_jogadores where sala_id = s.id and usuario_id = auth.uid();
  -- quem conhece a palavra não pode dizê-la (o impostor não é barrado: não deve haver como "testar" palpites)
  if v_papel = 'comum' and length(imp_norm(s.palavra)) >= 3 and position(imp_norm(s.palavra) in imp_norm(v_t)) > 0 then
    raise exception 'Você não pode usar a palavra secreta na dica.';
  end if;
  insert into imp_dicas (sala_id, rodada, usuario_id, texto) values (s.id, s.rodada, auth.uid(), v_t);
  perform imp_avancar_vez(s.id);
end $$;

create or replace function public.imp_msg(p_codigo text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; j imp_jogadores%rowtype; v_t text := btrim(coalesce(p_texto, ''));
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, '')));
  select * into j from imp_jogadores where sala_id = s.id and usuario_id = auth.uid() and not saiu;
  if s.id is null or j.usuario_id is null then raise exception 'Você não está nesta sala.'; end if;
  if s.estado not in ('lobby', 'discussao', 'votacao', 'resultado', 'fim') then raise exception 'O chat abre na discussão.'; end if;
  if s.estado in ('discussao', 'votacao', 'resultado') and not j.vivo then raise exception 'Quem foi eliminado só acompanha.'; end if;
  if char_length(v_t) < 1 or char_length(v_t) > 200 then raise exception 'Mensagem inválida.'; end if;
  if (select count(*) from imp_msgs where sala_id = s.id and usuario_id = auth.uid() and criado_em > now() - interval '5 seconds') >= 4 then raise exception 'Calma! Envie mais devagar.'; end if;
  insert into imp_msgs (sala_id, usuario_id, texto) values (s.id, auth.uid(), v_t);
end $$;

create or replace function public.imp_votar(p_codigo text, p_alvo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_uid uuid := auth.uid(); v_pend integer;
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, ''))) for update;
  if not found or s.estado <> 'votacao' then raise exception 'A votação não está aberta.'; end if;
  if not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = v_uid and vivo and not saiu) then raise exception 'Você não pode votar agora.'; end if;
  if p_alvo is null or p_alvo = v_uid then raise exception 'Você não pode votar em si mesmo.'; end if;
  if not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = p_alvo and vivo and not saiu) then raise exception 'Esse jogador não está disponível.'; end if;
  if s.candidatos is not null and not (p_alvo = any (s.candidatos)) then raise exception 'Nesta votação só dá para escolher entre os empatados.'; end if;
  if exists (select 1 from imp_votos where sala_id = s.id and rodada = s.rodada and volta = s.revotos and votante = v_uid) then raise exception 'Você já votou nesta rodada.'; end if;
  insert into imp_votos (sala_id, rodada, volta, votante, alvo) values (s.id, s.rodada, s.revotos, v_uid, p_alvo);
  -- todos os presentes votaram? apura na hora
  select count(*) into v_pend from imp_jogadores j where j.sala_id = s.id and j.vivo and not j.saiu and not j.ausente
    and not exists (select 1 from imp_votos v where v.sala_id = s.id and v.rodada = s.rodada and v.volta = s.revotos and v.votante = j.usuario_id);
  if v_pend = 0 then perform imp_apurar(s.id); end if;
end $$;

create or replace function public.imp_chute(p_codigo text, p_palavra text)
returns boolean language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_ok boolean;
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, ''))) for update;
  if not found or s.estado <> 'ultima' or s.ultimo_eliminado is distinct from auth.uid() then raise exception 'Você não tem uma última chance agora.'; end if;
  v_ok := imp_norm(p_palavra) <> '' and imp_norm(p_palavra) = imp_norm(s.palavra);
  update imp_salas set chute = left(btrim(coalesce(p_palavra, '')), 40), chute_ok = v_ok where id = s.id;
  perform imp_finalizar(s.id, 'comuns');
  return v_ok;
end $$;

-- Estado da sala, personalizado: cada pessoa só recebe o que tem direito de ver.
create or replace function public.imp_estado(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_uid uuid := auth.uid(); v_eu imp_jogadores%rowtype; v_rev boolean; v_pal text; v_agora timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'Sem acesso'; end if;
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found then raise exception 'Sala não encontrada.'; end if;
  select * into v_eu from imp_jogadores where sala_id = s.id and usuario_id = v_uid;
  if not found or v_eu.saiu then raise exception 'Você não está nesta sala.'; end if;
  update imp_jogadores set ultimo_visto = v_agora, ausente = false where sala_id = s.id and usuario_id = v_uid;
  perform imp_tick(s.id);
  select * into s from imp_salas where id = s.id;
  v_rev := s.estado = 'fim';
  v_pal := case when s.estado = 'lobby' then null when v_rev then s.palavra when v_eu.papel = 'comum' then s.palavra else null end;
  return jsonb_build_object(
    'codigo', s.codigo, 'nome', s.nome, 'publica', s.publica, 'estado', s.estado, 'rodada', s.rodada, 'anfitriao', s.anfitriao, 'eu', v_uid,
    'meu_papel', case when s.estado = 'lobby' then null else v_eu.papel end,
    'palavra', v_pal,
    'prazo', s.prazo, 'agora', clock_timestamp(), 'vez', s.vez, 'candidatos', s.candidatos, 'revotos', s.revotos,
    'cfg', jsonb_build_object('max', s.max_jogadores, 'impostores', s.n_impostores, 't_dica', s.t_dica, 't_discussao', s.t_discussao, 't_votacao', s.t_votacao, 'categorias', s.categorias),
    'ordem', s.ordem,
    'jogadores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', j.usuario_id, 'nome', coalesce(p.nome, 'Jogador'), 'foto', p.foto_url, 'pronto', j.pronto, 'vivo', j.vivo, 'saiu', j.saiu, 'ausente', j.ausente,
        'online', j.ultimo_visto > now() - interval '20 seconds', 'eliminado', j.eliminado,
        'papel', case when v_rev or j.eliminado or j.usuario_id = v_uid then j.papel else null end,
        'pontos', case when v_rev then j.pontos else null end) order by j.entrou_em)
      from imp_jogadores j left join perfis p on p.id = j.usuario_id where j.sala_id = s.id), '[]'::jsonb),
    'dicas', coalesce((select jsonb_agg(jsonb_build_object('rodada', d.rodada, 'id', d.usuario_id, 'texto', d.texto) order by d.id) from imp_dicas d where d.sala_id = s.id), '[]'::jsonb),
    'msgs', coalesce((select jsonb_agg(m order by m.id) from (select id, usuario_id as de, texto, criado_em as t from imp_msgs where sala_id = s.id order by id desc limit 60) m), '[]'::jsonb),
    'votei', exists (select 1 from imp_votos v where v.sala_id = s.id and v.rodada = s.rodada and v.volta = s.revotos and v.votante = v_uid),
    'votos_n', (select count(*) from imp_votos v where v.sala_id = s.id and v.rodada = s.rodada and v.volta = s.revotos),
    'resultado', s.ultimo_resultado, 'ultimo_eliminado', s.ultimo_eliminado,
    'vencedor', s.vencedor, 'chute', case when v_rev then s.chute else null end, 'chute_ok', case when v_rev then s.chute_ok else null end,
    'proxima_sala', s.proxima_sala
  );
end $$;

create or replace function public.imp_revanche(p_codigo text)
returns text language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_cod text; v_uid uuid := auth.uid(); v_id uuid;
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, ''))) for update;
  if not found or s.estado <> 'fim' or not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = v_uid) then raise exception 'Revanche indisponível.'; end if;
  if s.proxima_sala is not null then return s.proxima_sala; end if;
  v_cod := imp_codigo_novo();
  insert into imp_salas (codigo, nome, publica, anfitriao, max_jogadores, n_impostores, categorias, t_dica, t_discussao, t_votacao, usadas)
    values (v_cod, s.nome, false, v_uid, s.max_jogadores, s.n_impostores, s.categorias, s.t_dica, s.t_discussao, s.t_votacao, s.usadas) returning id into v_id;
  insert into imp_jogadores (sala_id, usuario_id, pronto) values (v_id, v_uid, true);
  update imp_salas set proxima_sala = v_cod where id = s.id;
  return v_cod;
end $$;

create or replace function public.imp_denunciar(p_codigo text, p_alvo uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype; v_m text := btrim(coalesce(p_motivo, ''));
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found or not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = auth.uid())
     or not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = p_alvo) or p_alvo = auth.uid() then raise exception 'Denúncia inválida.'; end if;
  if char_length(v_m) < 5 then raise exception 'Descreva o motivo com pelo menos 5 caracteres.'; end if;
  if (select count(*) from imp_denuncias where denunciante = auth.uid() and criado_em > now() - interval '1 day') >= 10 then raise exception 'Limite de denúncias do dia atingido.'; end if;
  insert into imp_denuncias (sala_id, codigo, denunciante, alvo, motivo) values (s.id, s.codigo, auth.uid(), p_alvo, left(v_m, 500));
end $$;

create or replace function public.imp_convidar(p_codigo text, p_para uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s imp_salas%rowtype;
begin
  select * into s from imp_salas where codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found or s.estado <> 'lobby' or not exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = auth.uid()) then raise exception 'Só dá para convidar com a sala aberta.'; end if;
  if p_para is null or p_para = auth.uid() or not exists (select 1 from perfis where id = p_para and coalesce(ativo, true) and not coalesce(bloqueado, false)) then raise exception 'Pessoa inválida.'; end if;
  if exists (select 1 from imp_jogadores where sala_id = s.id and usuario_id = p_para and not saiu) then return; end if;
  if (select count(*) from imp_convites where de = auth.uid() and criado_em > now() - interval '1 day') >= 40 then raise exception 'Limite de convites do dia atingido.'; end if;
  delete from imp_convites where de = auth.uid() and para = p_para and codigo = s.codigo;
  insert into imp_convites (de, para, codigo, sala_nome) values (auth.uid(), p_para, s.codigo, s.nome);
end $$;

create or replace function public.imp_meus_convites()
returns table (id bigint, de_nome text, sala_nome text, codigo text)
language sql stable security definer set search_path = public as $$
  select c.id, p.nome, c.sala_nome, c.codigo from imp_convites c
    join perfis p on p.id = c.de join imp_salas s on s.codigo = c.codigo and s.estado = 'lobby'
  where c.para = auth.uid() and c.criado_em > now() - interval '15 minutes' order by c.id desc limit 10
$$;

create or replace function public.imp_responder_convite(p_id bigint, p_aceitar boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_cod text;
begin
  select codigo into v_cod from imp_convites where id = p_id and para = auth.uid();
  delete from imp_convites where id = p_id and para = auth.uid();
  if v_cod is not null and coalesce(p_aceitar, false) then return imp_entrar(v_cod); end if;
  return null;
end $$;

create or replace function public.imp_ranking()
returns table (usuario_id uuid, nome text, foto_url text, pontos integer, partidas integer, vitorias integer)
language sql stable security definer set search_path = public as $$
  select s.usuario_id, p.nome, p.foto_url, s.pontos, s.partidas, s.vit_impostor + s.vit_comum
  from imp_stats s join perfis p on p.id = s.usuario_id
  where public.usuario_liberado() and coalesce(p.ativo, true) and not coalesce(p.bloqueado, false)
  order by s.pontos desc, s.partidas desc limit 20
$$;

create or replace function public.imp_meu_desempenho()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'stats', (select to_jsonb(s) from imp_stats s where s.usuario_id = auth.uid()),
    'historico', coalesce((select jsonb_agg(h) from (select papel, venceu, pontos, criado_em from imp_historico where usuario_id = auth.uid() order by id desc limit 10) h), '[]'::jsonb))
$$;

-- ===== Quem pode chamar o quê =====
do $$ declare f text; begin
  foreach f in array array[
    'imp_norm(text)', 'imp_proxima_vez(uuid,integer)', 'imp_cancelar(uuid)', 'imp_finalizar(uuid,text)', 'imp_checar_fim(uuid)', 'imp_comecar_dicas(uuid)',
    'imp_avancar_vez(uuid)', 'imp_apurar(uuid)', 'imp_tick(uuid)', 'imp_sair_interno(uuid,uuid)', 'imp_limpar_antigas(uuid)', 'imp_codigo_novo()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'imp_sala_atual()', 'imp_categorias_lista()', 'imp_criar_sala(text,boolean,integer,integer,integer[],integer,integer,integer)', 'imp_entrar(text)',
    'imp_salas_publicas()', 'imp_jogar_agora()', 'imp_pronto(text,boolean)', 'imp_sair(text)', 'imp_iniciar(text)', 'imp_dica(text,text)', 'imp_msg(text,text)',
    'imp_votar(text,uuid)', 'imp_chute(text,text)', 'imp_estado(text)', 'imp_revanche(text)', 'imp_denunciar(text,uuid,text)', 'imp_convidar(text,uuid)',
    'imp_meus_convites()', 'imp_responder_convite(bigint,boolean)', 'imp_ranking()', 'imp_meu_desempenho()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
