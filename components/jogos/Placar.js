'use client';
import { useEffect, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

const MODO = { solo: '1 jogador', dois: '2 jogadores' };

export default function Placar({ jogo, atualizar }) {
  const [rank, setRank] = useState(null);
  const [meus, setMeus] = useState([]);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let vivo = true;
    (async () => {
      const sb = criarCliente();
      const [r, m] = await Promise.all([
        sb.rpc('ranking_jogos', { p_jogo: jogo }),
        sb.from('jogos_partidas').select('modo, pontos, vitoria, criado_em').eq('jogo', jogo).order('criado_em', { ascending: false }).limit(5),
      ]);
      if (!vivo) return;
      if (r.error || m.error) { setErro('Placar indisponível. Rode o arquivo supabase/jogos.sql no Supabase.'); return; }
      setErro(''); setRank(r.data || []); setMeus(m.data || []);
    })();
    return () => { vivo = false; };
  }, [jogo, atualizar]);

  const ehTruco = jogo === 'truco';
  return (
    <div className="dois" style={{ marginTop: 6 }}>
      <section className="card" aria-label="Ranking">
        <h3>Ranking {ehTruco ? '(vitórias)' : '(melhor pontuação)'}</h3>
        {erro ? <p className="msg erro">{erro}</p> : !rank ? <p className="carregando">Carregando…</p> : rank.length === 0 ? <p className="vazio">Ninguém pontuou ainda. Seja o primeiro!</p> :
          rank.map((r, i) => (
            <div className="item" key={r.nome + i}>
              <span><b>{i + 1}º</b> {r.nome}<small>{r.partidas} partida{r.partidas === 1 ? '' : 's'}</small></span>
              <b>{ehTruco ? `${r.vitorias} 🏆` : r.melhor}</b>
            </div>
          ))}
      </section>
      <section className="card" aria-label="Minhas últimas partidas">
        <h3>Minhas últimas partidas</h3>
        {erro ? null : meus.length === 0 ? <p className="vazio">Você ainda não jogou este jogo.</p> :
          meus.map((m, i) => (
            <div className="item" key={i}>
              <span>{MODO[m.modo]}<small>{new Date(m.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}</small></span>
              <span>{m.vitoria === true && <span className="tag ok">Vitória</span>}{m.vitoria === false && <span className="tag erro">Derrota</span>}<b>{m.pontos} pts</b></span>
            </div>
          ))}
      </section>
    </div>
  );
}
