'use client';
import { useEffect, useRef, useState } from 'react';
import Carta from './Carta';
import { baralho, embaralhar, idCarta } from '@/lib/cartas';

const NIVEIS = { facil: { pares: 6, cols: 4, nome: 'Fácil' }, medio: { pares: 8, cols: 4, nome: 'Médio' }, dificil: { pares: 10, cols: 5, nome: 'Difícil' } };

function montar(pares) {
  const faces = embaralhar(baralho()).slice(0, pares);
  return embaralhar([...faces, ...faces]).map((f, id) => ({ id, f, achada: false }));
}

export default function Memoria({ modo, aoTerminar }) {
  const [nivel, setNivel] = useState(null);
  if (!nivel) {
    return (
      <div className="j-mesa" style={{ textAlign: 'center' }}>
        <h3>Escolha a dificuldade</h3>
        <div className="j-acoes">{Object.entries(NIVEIS).map(([k, v]) => <button key={k} className="btn s" onClick={() => setNivel(k)}>{v.nome} · {v.pares} pares</button>)}</div>
      </div>
    );
  }
  return <MemoriaJogo key={nivel} nivel={NIVEIS[nivel]} modo={modo} aoTerminar={aoTerminar} trocar={() => setNivel(null)} />;
}

function MemoriaJogo({ nivel, modo, aoTerminar, trocar }) {
  const n = modo === 'dois' ? 2 : 1;
  const [cartas, setCartas] = useState(() => montar(nivel.pares));
  const [viradas, setViradas] = useState([]);
  const [trava, setTrava] = useState(false);
  const [vez, setVez] = useState(0);
  const [jogadas, setJogadas] = useState(0);
  const [pares, setPares] = useState([0, 0]);
  const [seg, setSeg] = useState(0);
  const [fim, setFim] = useState(false);
  const timer = useRef(null);
  const enviado = useRef(false);
  const nome = (i) => (n === 1 ? 'Você' : `Jogador ${i + 1}`);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (fim) return;
    const t = setInterval(() => setSeg((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [fim]);
  useEffect(() => { if (!fim && cartas.every((c) => c.achada)) setFim(true); }, [cartas, fim]);

  const pontos = Math.max(0, pares[0] * 60 - (jogadas - pares[0] - pares[1]) * 5 - seg);
  useEffect(() => {
    if (!fim || enviado.current) return;
    enviado.current = true;
    aoTerminar?.({ pontos: n === 1 ? pontos : pares[0] * 100, vitoria: n === 2 ? (pares[0] === pares[1] ? null : pares[0] > pares[1]) : null, detalhes: { pares, jogadas, segundos: seg, pares_total: nivel.pares } });
  }, [fim]); // eslint-disable-line react-hooks/exhaustive-deps

  const clicar = (i) => {
    if (trava || fim) return;
    if (cartas[i].achada || viradas.includes(i)) return;
    const v = [...viradas, i];
    setViradas(v);
    if (v.length < 2) return;
    setTrava(true);
    setJogadas((j) => j + 1);
    const [a, b] = v;
    const ok = idCarta(cartas[a].f) === idCarta(cartas[b].f);
    timer.current = setTimeout(() => {
      if (ok) {
        setCartas((cs) => cs.map((x, k) => (k === a || k === b ? { ...x, achada: true } : x)));
        setPares((p) => p.map((x, k) => (k === vez ? x + 1 : x)));
      } else if (n === 2) setVez((x) => 1 - x);
      setViradas([]);
      setTrava(false);
    }, ok ? 500 : 900);
  };
  const reiniciar = () => { clearTimeout(timer.current); enviado.current = false; setCartas(montar(nivel.pares)); setViradas([]); setTrava(false); setVez(0); setJogadas(0); setPares([0, 0]); setSeg(0); setFim(false); };
  const mm = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;

  return (
    <div className="j-mesa">
      <div className="linha">
        <span><span className="tag">⏱ {mm}</span><span className="tag">Jogadas: {jogadas}</span>{n === 2 && !fim && <span className="tag ok" role="status">Vez de {nome(vez)}</span>}</span>
        <span>{n === 2 ? pares.map((p, i) => <span className="tag ok" key={i}>{nome(i)}: {p}</span>) : <span className="tag ok">Pares: {pares[0]}/{nivel.pares}</span>}</span>
      </div>
      <div className="j-memoria" style={{ '--cols': nivel.cols }}>
        {cartas.map((c, i) => {
          const aberta = c.achada || viradas.includes(i);
          return <Carta key={c.id} c={c.f} baixo={!aberta} largura="100%" sel={c.achada} onClick={() => clicar(i)} desabilitada={c.achada || fim} />;
        })}
      </div>
      {fim && <p role="status" className="j-final">{n === 1 ? `Parabéns! ${pontos} pontos em ${jogadas} jogadas e ${mm}.` : pares[0] === pares[1] ? `Empate: ${pares[0]} a ${pares[1]}.` : `${nome(pares[0] > pares[1] ? 0 : 1)} venceu: ${pares[0]} a ${pares[1]}.`}</p>}
      <div className="j-acoes"><button className="btn p" onClick={reiniciar}>{fim ? 'Jogar de novo' : 'Recomeçar'}</button><button className="btn o" onClick={trocar}>Mudar dificuldade</button></div>
    </div>
  );
}
