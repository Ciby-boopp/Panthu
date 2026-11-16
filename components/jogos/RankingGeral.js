'use client';
import { useEffect, useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

const PERIODOS = [['semana', 'Semana'], ['mes', 'Mês'], ['sempre', 'Sempre']];

// Ranking de vitórias de todos os jogadores (partidas contra o computador ou online; no mesmo aparelho não conta).
export default function RankingGeral({ atualizar = 0 }) {
  const sb = useRef(null);
  const [periodo, setPeriodo] = useState('semana');
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let vivo = true;
    setLista(null);
    (async () => {
      const { data, error } = await (sb.current ||= criarCliente()).rpc('ranking_geral', { p_periodo: periodo });
      if (!vivo) return;
      if (error) { setErro('Ranking indisponível. Rode o arquivo supabase/pontos-favoritos-lgpd.sql no Supabase.'); setLista([]); return; }
      setErro(''); setLista(data || []);
    })();
    return () => { vivo = false; };
  }, [periodo, atualizar]);
  return (
    <section className="card" aria-label="Ranking geral de vitórias">
      <div className="linha"><h3>🏆 Ranking de vitórias</h3>
        <span role="group" aria-label="Período">{PERIODOS.map(([k, n]) => <button key={k} className={`btn mini ${periodo === k ? 'p' : 'o'}`} aria-pressed={periodo === k} onClick={() => setPeriodo(k)} style={{ marginLeft: 6 }}>{n}</button>)}</span>
      </div>
      {erro ? <p className="msg erro">{erro}</p> : !lista ? <p className="carregando">Carregando…</p> : lista.length === 0 ? <p className="vazio" style={{ padding: 16 }}>Ninguém venceu ainda neste período. Seja o primeiro!</p> :
        lista.map((r, i) => (
          <div className="item" key={r.nome + i} style={{ alignItems: 'center' }}>
            <span><span className={`rank-pos ${i < 3 ? 'top' : ''}`}>{i + 1}</span>{r.nome}<small style={{ marginLeft: 40 }}>{r.partidas} partida{r.partidas === 1 ? '' : 's'} · {r.pontos} pontos</small></span>
            <b>{r.vitorias} 🏆</b>
          </div>
        ))}
    </section>
  );
}
