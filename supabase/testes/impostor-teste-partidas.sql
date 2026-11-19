\set ON_ERROR_STOP 0
create or replace function pg_temp.u(n uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', n::text, false) $$;
create or replace function pg_temp.uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
-- cria sala iniciada com jogadores 1..n e n_imp impostores
create or replace function pg_temp.nova(n int, nimp int) returns text language plpgsql as $$
declare c text; i int;
begin
  perform pg_temp.u(pg_temp.uid(1)); perform imp_sair(imp_sala_atual());
  for i in 2..n loop perform pg_temp.u(pg_temp.uid(i)); perform imp_sair(imp_sala_atual()); end loop;
  perform pg_temp.u(pg_temp.uid(1)); c := imp_criar_sala('S', true, 12, nimp, '{}', 15, 30, 15);
  for i in 2..n loop perform pg_temp.u(pg_temp.uid(i)); perform imp_entrar(c); perform imp_pronto(c, true); end loop;
  perform pg_temp.u(pg_temp.uid(1)); perform imp_iniciar(c);
  return c;
end $$;
do $$
declare c text; s imp_salas%rowtype; u uuid; i int; imp uuid; com uuid[]; st jsonb; r text; x record;
begin
  -- A) palavra secreta barrada para comum
  c := pg_temp.nova(5,1); select * into s from imp_salas where codigo=c;
  for i in 1..5 loop
    select vez into u from imp_salas where id=s.id; exit when u is null or (select estado from imp_salas where id=s.id)<>'dicas';
    perform pg_temp.u(u);
    if (select papel from imp_jogadores where sala_id=s.id and usuario_id=u)='comum' then
      begin perform imp_dica(c, 'É o '||upper(s.palavra)); raise notice 'FALHOU A: palavra aceita'; exception when others then raise notice 'A ok comum barrado: %', sqlerrm; end;
    end if;
    perform imp_dica(c, 'qualquer');
  end loop;
  -- B) empate → revotação → sem eliminar
  update imp_salas set prazo=now()-interval '1s' where id=s.id; perform imp_estado(c);  -- discussao→votacao
  select array_agg(usuario_id order by usuario_id) into com from imp_jogadores where sala_id=s.id;
  -- 5 jogadores: 1→2, 2→1, 3→2, 4→1, 5→3  => 1:2 votos, 2:2 votos (empate)
  perform pg_temp.u(com[1]); perform imp_votar(c, com[2]);
  perform pg_temp.u(com[2]); perform imp_votar(c, com[1]);
  perform pg_temp.u(com[3]); perform imp_votar(c, com[2]);
  perform pg_temp.u(com[4]); perform imp_votar(c, com[1]);
  perform pg_temp.u(com[5]); perform imp_votar(c, com[3]);
  st := imp_estado(c); raise notice 'B estado=% tipo=% candidatos=%', st->>'estado', st->'resultado'->>'tipo', st->'candidatos';
  perform pg_temp.u(com[3]); begin perform imp_votar(c, com[5]); raise notice 'FALHOU B: voto fora dos candidatos'; exception when others then raise notice 'B ok: %', sqlerrm; end;
  -- revotação: todos escolhem entre os candidatos (quem é candidato vota no outro)
  for i in 1..5 loop perform pg_temp.u(com[i]); begin perform imp_votar(c, case when com[i]=com[1] then com[2] when com[i]=com[2] then com[1] else com[1] end); exception when others then raise notice 'revote erro %: %', i, sqlerrm; end; end loop;
  st := imp_estado(c); raise notice 'B2 estado=% tipo=%', st->>'estado', st->'resultado'->>'tipo';

  -- C) vitória do impostor por superioridade numérica (4 jogadores, 1 impostor, elimina 1 comum + ... )
  c := pg_temp.nova(4,1); select * into s from imp_salas where codigo=c;
  select usuario_id into imp from imp_jogadores where sala_id=s.id and papel='impostor';
  select array_agg(usuario_id) into com from imp_jogadores where sala_id=s.id and papel='comum';
  update imp_salas set estado='votacao', prazo=now()+interval '30s', revotos=0 where id=s.id;
  -- todos votam em com[1]
  for x in select usuario_id from imp_jogadores where sala_id=s.id loop
    perform pg_temp.u(x.usuario_id);
    begin perform imp_votar(c, case when x.usuario_id=com[1] then com[2] else com[1] end); exception when others then raise notice 'C erro: %', sqlerrm; end;
  end loop;
  st := imp_estado(c); raise notice 'C estado=% (1 imp vs 2 comuns: continua)', st->>'estado';
  update imp_salas set estado='votacao', prazo=now()+interval '30s', revotos=0, rodada=rodada+1 where id=s.id;
  perform pg_temp.u(com[2]); perform imp_votar(c, com[3]);
  perform pg_temp.u(com[3]); perform imp_votar(c, com[2]);
  perform pg_temp.u(imp); perform imp_votar(c, com[2]);
  st := imp_estado(c); raise notice 'C2 estado=% vencedor=% (esperado fim/impostores)', st->>'estado', st->>'vencedor';
  for x in select j->>'papel' p, j->>'pontos' pts from jsonb_array_elements(st->'jogadores') j loop raise notice '  % %', x.p, x.pts; end loop;

  -- D) chute correto dá +50
  c := pg_temp.nova(5,1); select * into s from imp_salas where codigo=c;
  select usuario_id into imp from imp_jogadores where sala_id=s.id and papel='impostor';
  update imp_salas set estado='votacao', prazo=now()+interval '30s', revotos=0 where id=s.id;
  for x in select usuario_id from imp_jogadores where sala_id=s.id loop perform pg_temp.u(x.usuario_id); perform imp_votar(c, case when x.usuario_id=imp then (select usuario_id from imp_jogadores where sala_id=s.id and usuario_id<>imp limit 1) else imp end); end loop;
  perform pg_temp.u(imp); st := imp_estado(c); raise notice 'D estado=%', st->>'estado';
  r := imp_chute(c, replace(lower(s.palavra),'a','á')::text)::text; raise notice 'D chute com acento errado=% (esperado false se a palavra tem a)', r;
end $$;
