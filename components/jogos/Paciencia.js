'use client';
import { useEffect, useRef, useState } from 'react';
import Carta from './Carta';
import { NAIPES, baralho, embaralhar, rng, rank, vermelho } from '@/lib/cartas';

const topo = (a) => a[a.length - 1];

function distribuir(semente) {
  const b = embaralhar(baralho(), rng(semente));
  let k = 0;
  const tab = [];
  for (let i = 0; i < 7; i++) { const col = []; for (let j = 0; j <= i; j++) col.push({ c: b[k++], up: j === i }); tab.push(col); }
  return { stock: b.slice(k), waste: [], fund: [[], [], [], []], tab, pontos: 0, mov: 0, vitoria: false };
}
function cartasDe(s, sel) {
  if (sel.de === 'waste') return s.waste.length ? [topo(s.waste)] : [];
  if (sel.de === 'fund') return s.fund[sel.p].length ? [topo(s.fund[sel.p])] : [];
  return s.tab[sel.col].slice(sel.idx).map((x) => x.c);
}
const podeTab = (c, col) => { const t = topo(col); return !t ? c.v === 'K' : t.up && vermelho(t.c.n) !== vermelho(c.n) && rank(t.c) === rank(c) + 1; };
const podeFund = (s, c, p) => NAIPES[p] === c.n && s.fund[p].length + 1 === rank(c);

// Devolve o novo estado ou null se a jogada não for válida.
function mover(s, sel, dest) {
  const cs = cartasDe(s, sel);
  if (!cs.length) return null;
  const n = structuredClone(s);
  let ganho = 0;
  if (dest.para === 'tab') {
    if (sel.de === 'tab' && sel.col === dest.col) return null;
    if (!podeTab(cs[0], n.tab[dest.col])) return null;
    if (!n.tab[dest.col].length && sel.de === 'tab' && sel.idx === 0) return null;
    if (sel.de === 'waste') ganho += 5;
    if (sel.de === 'fund') ganho -= 15;
  } else {
    if (cs.length !== 1 || sel.de === 'fund' || !podeFund(s, cs[0], dest.p)) return null;
    ganho += 10;
  }
  if (sel.de === 'waste') n.waste.pop();
  else if (sel.de === 'fund') n.fund[sel.p].pop();
  else {
    n.tab[sel.col].splice(sel.idx);
    const t = topo(n.tab[sel.col]);
    if (t && !t.up) { t.up = true; ganho += 5; }
  }
  if (dest.para === 'tab') n.tab[dest.col].push(...cs.map((c) => ({ c, up: true })));
  else n.fund[dest.p].push(cs[0]);
  n.pontos = Math.max(0, n.pontos + ganho);
  n.mov++;
  n.vitoria = n.fund.every((f) => f.length === 13);
  return n;
}
function paraFundacao(s, sel) {
  const cs = cartasDe(s, sel);
  if (cs.length !== 1 || sel.de === 'fund') return null;
  return mover(s, sel, { para: 'fund', p: NAIPES.indexOf(cs[0].n) });
}

function PacienciaJogo({ semente, rotulo, aoFim }) {
  const [s, setS] = useState(() => distribuir(semente));
  const [sel, setSel] = useState(null);
  const [hist, setHist] = useState([]);
  const [seg, setSeg] = useState(0);
  const [fim, setFim] = useState(false);
  const enviado = useRef(false);

  useEffect(() => { if (fim) return; const t = setInterval(() => setSeg((x) => x + 1), 1000); return () => clearInterval(t); }, [fim]);
  useEffect(() => { if (s.vitoria) setFim(true); }, [s.vitoria]);
  const final = s.pontos + (s.vitoria ? Math.max(0, 600 - seg) : 0);
  useEffect(() => {
    if (!fim || enviado.current) return;
    enviado.current = true;
    aoFim(final, s.vitoria, { segundos: seg, movimentos: s.mov });
  }, [fim]); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicar = (novo) => { setHist((h) => [...h.slice(-100), s]); setS(novo); setSel(null); };
  const comprar = () => {
    if (fim) return;
    const n = structuredClone(s);
    if (n.stock.length) n.waste.push(n.stock.pop());
    else if (n.waste.length) { n.stock = n.waste.reverse(); n.waste = []; n.pontos = Math.max(0, n.pontos - 10); }
    else return;
    n.mov++;
    aplicar(n);
  };
  const tentar = (dest) => { const n = mover(s, sel, dest); if (n) aplicar(n); else setSel(null); };
  const clicarSobra = () => {
    if (fim || !s.waste.length) return;
    if (sel?.de === 'waste') { const n = paraFundacao(s, sel); if (n) aplicar(n); else setSel(null); } else setSel({ de: 'waste' });
  };
  const clicarFund = (p) => {
    if (fim) return;
    if (sel) tentar({ para: 'fund', p });
    else if (s.fund[p].length) setSel({ de: 'fund', p });
  };
  const clicarCol = (col, idx) => {
    if (fim) return;
    const alvo = s.tab[col][idx];
    if (sel) {
      if (sel.de === 'tab' && sel.col === col && sel.idx === idx) { const n = paraFundacao(s, sel); if (n) aplicar(n); else setSel(null); return; }
      const n = mover(s, sel, { para: 'tab', col });
      if (n) { aplicar(n); return; }
    }
    setSel(alvo && alvo.up ? { de: 'tab', col, idx } : null);
  };
  const clicarVazia = (col) => { if (!fim && sel) tentar({ para: 'tab', col }); };
  const desfazer = () => { if (!hist.length || fim) return; setS(hist[hist.length - 1]); setHist((h) => h.slice(0, -1)); setSel(null); };
  const mm = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  const selWaste = sel?.de === 'waste';

  return (
    <div className="j-mesa j-pac">
      <div className="linha">
        <span>{rotulo && <span className="tag ok">{rotulo}</span>}<span className="tag">⏱ {mm}</span><span className="tag">Pontos: {s.pontos}</span></span>
        <span><button className="btn s mini" onClick={desfazer} disabled={!hist.length || fim}>Desfazer</button> <button className="btn o mini" onClick={() => setFim(true)} disabled={fim}>Terminar</button></span>
      </div>
      <div className="j-pac-grade j-pac-topo">
        <button className="j-slot" onClick={comprar} aria-label={s.stock.length ? 'Comprar carta' : 'Reciclar descarte'}>
          {s.stock.length ? <Carta baixo largura="100%" /> : <span>{s.waste.length ? '↺' : ''}</span>}
        </button>
        <div className="j-slot semb">{s.waste.length ? <Carta c={topo(s.waste)} largura="100%" sel={selWaste} onClick={clicarSobra} /> : null}</div>
        <span />
        {NAIPES.map((np, p) => (
          <div className="j-slot semb" key={np}>
            {s.fund[p].length ? <Carta c={topo(s.fund[p])} largura="100%" sel={sel?.de === 'fund' && sel.p === p} onClick={() => clicarFund(p)} /> : <button className="j-slot-n" onClick={() => clicarFund(p)} aria-label={`Fundação de ${np}`}>{np}</button>}
          </div>
        ))}
      </div>
      <div className="j-pac-grade">
        {s.tab.map((col, ci) => (
          <div className="j-col" key={ci}>
            {col.length === 0 && <button className="j-slot" onClick={() => clicarVazia(ci)} aria-label={`Coluna ${ci + 1} vazia`} />}
            {col.map((x, idx) => (
              <Carta key={x.c.v + x.c.n} c={x.c} baixo={!x.up} largura="100%"
                sel={sel?.de === 'tab' && sel.col === ci && idx >= sel.idx}
                onClick={x.up ? () => clicarCol(ci, idx) : undefined}
                style={idx > 0 ? { marginTop: col[idx - 1].up ? '-104%' : '-118%' } : undefined} />
            ))}
          </div>
        ))}
      </div>
      <p className="j-dica">Toque numa carta e depois no destino. Toque de novo na mesma carta para mandá-la à fundação (A a K de cada naipe).</p>
      {fim && <p role="status" className="j-final">{s.vitoria ? `Você venceu! ${final} pontos (com bônus de tempo).` : `Fim de jogo: ${final} pontos.`}</p>}
    </div>
  );
}

export default function Paciencia({ modo, aoTerminar }) {
  const [semente, setSemente] = useState(() => Math.floor(Math.random() * 1e9));
  const [etapa, setEtapa] = useState(0); // 0 jogador 1 · 1 troca · 2 jogador 2 · 3 resultado
  const [res, setRes] = useState([]);
  const [rodada, setRodada] = useState(0);
  const novo = () => { setSemente(Math.floor(Math.random() * 1e9)); setEtapa(0); setRes([]); setRodada((r) => r + 1); };

  if (modo === 'solo') {
    return (<>
      <PacienciaJogo key={`s${rodada}`} semente={semente} rotulo="" aoFim={(pontos, vitoria, d) => aoTerminar?.({ pontos, vitoria, detalhes: d })} />
      <div className="j-acoes"><button className="btn p" onClick={novo}>Novo jogo</button></div>
    </>);
  }
  if (etapa === 0) return <PacienciaJogo key={`a${rodada}`} semente={semente} rotulo="Jogador 1" aoFim={(p, v, d) => { setRes([{ p, v, d }]); setEtapa(1); }} />;
  if (etapa === 1) return (
    <div className="j-mesa" style={{ textAlign: 'center' }}>
      <h3>Jogador 1 fez {res[0].p} pontos</h3>
      <p>Agora é a vez do Jogador 2, com <b>as mesmas cartas</b>. Passe o aparelho!</p>
      <button className="btn p" onClick={() => setEtapa(2)}>Começar Jogador 2</button>
    </div>
  );
  if (etapa === 2) return <PacienciaJogo key={`b${rodada}`} semente={semente} rotulo="Jogador 2" aoFim={(p2, v2, d2) => {
    const p1 = res[0].p;
    setRes([res[0], { p: p2, v: v2, d: d2 }]); setEtapa(3);
    aoTerminar?.({ pontos: p1, vitoria: p1 === p2 ? null : p1 > p2, detalhes: { ...res[0].d, pontos_j2: p2 } });
  }} />;
  return (
    <div className="j-mesa" style={{ textAlign: 'center' }}>
      <h3>{res[0].p === res[1].p ? 'Empate!' : `Jogador ${res[0].p > res[1].p ? 1 : 2} venceu!`}</h3>
      <p>Jogador 1: <b>{res[0].p}</b> pontos · Jogador 2: <b>{res[1].p}</b> pontos</p>
      <button className="btn p" onClick={novo}>Jogar de novo</button>
    </div>
  );
}
