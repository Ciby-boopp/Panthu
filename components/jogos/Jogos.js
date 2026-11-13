'use client';
import { useCallback, useState } from 'react';
import Blackjack from './Blackjack';
import Memoria from './Memoria';
import Truco from './Truco';
import Paciencia from './Paciencia';
import Placar from './Placar';
import Carta from './Carta';
import { salvarPartida } from '@/lib/placar';

const JOGOS = [
  { id: 'blackjack', nome: 'Blackjack', desc: 'Chegue o mais perto de 21 sem estourar.', Comp: Blackjack, c: { v: 'A', n: '♠' } },
  { id: 'memoria', nome: 'Memória', desc: 'Encontre os pares de cartas no menor tempo.', Comp: Memoria, c: { v: 'Q', n: '♥' } },
  { id: 'truco', nome: 'Truco', desc: 'Truco paulista contra o computador ou online.', Comp: Truco, c: { v: '4', n: '♣' } },
  { id: 'paciencia', nome: 'Paciência', desc: 'O clássico Klondike, de 1 a 2 jogadores.', Comp: Paciencia, c: { v: 'K', n: '♦' } },
];

export default function Jogos() {
  const [id, setId] = useState(null);
  const [modo, setModo] = useState('solo');
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [atualizar, setAtualizar] = useState(0);
  const jogo = JOGOS.find((j) => j.id === id);

  const salvar = useCallback(async (r) => {
    const { erro } = await salvarPartida({ jogo: id, modo, ...r });
    setAviso(erro ? { erro: true, t: 'Não consegui salvar a pontuação (rode supabase/jogos.sql no Supabase).' } : { erro: false, t: 'Pontuação salva!' });
    setAtualizar((x) => x + 1);
  }, [id, modo]);

  const escolher = (j) => { setId(j); setAviso(null); setChave((c) => c + 1); };
  const trocarModo = (m) => { setModo(m); setAviso(null); setChave((c) => c + 1); };

  if (!jogo) {
    return (
      <div className="grade-eventos" style={{ marginTop: 18 }}>
        {JOGOS.map((j) => (
          <button key={j.id} className="card j-card" onClick={() => escolher(j.id)}>
            <Carta c={j.c} largura="58px" />
            <span><b>{j.nome}</b><small>{j.desc}</small></span>
          </button>
        ))}
      </div>
    );
  }
  const Comp = jogo.Comp;
  const rotuloDois = jogo.id === 'truco' ? '2 jogadores (online)' : '2 jogadores (mesmo aparelho)';
  return (
    <>
      <div className="linha" style={{ margin: '12px 0' }}>
        <button className="btn o mini" onClick={() => setId(null)}>← Jogos</button>
        <h2 style={{ fontSize: 24 }}>{jogo.nome}</h2>
        <span className="j-modos" role="group" aria-label="Modo de jogo">
          <button className={`btn mini ${modo === 'solo' ? 'p' : 'o'}`} aria-pressed={modo === 'solo'} onClick={() => trocarModo('solo')}>1 jogador</button>
          <button className={`btn mini ${modo === 'dois' ? 'p' : 'o'}`} aria-pressed={modo === 'dois'} onClick={() => trocarModo('dois')}>{rotuloDois}</button>
        </span>
      </div>
      <Comp key={`${id}-${modo}-${chave}`} modo={modo} aoTerminar={salvar} />
      {aviso && <p className={`msg ${aviso.erro ? 'erro' : 'ok'}`} role="status">{aviso.t}</p>}
      <Placar jogo={id} atualizar={atualizar} />
    </>
  );
}
