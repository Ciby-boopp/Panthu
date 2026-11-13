'use client';
import { useEffect, useRef, useState } from 'react';
import Carta from './Carta';
import { baralho, embaralhar } from '@/lib/cartas';

const RODADAS = 5;
const PTS = { blackjack: 3, vitoria: 2, empate: 1, derrota: 0 };
const ROTULO = { blackjack: 'Blackjack! +3', vitoria: 'Venceu +2', empate: 'Empate +1', derrota: 'Perdeu' };
const valorCarta = (c) => (c.v === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.v) ? 10 : parseInt(c.v, 10));
export function total(mao) {
  let t = 0, ases = 0;
  for (const c of mao) { t += valorCarta(c); if (c.v === 'A') ases++; }
  while (t > 21 && ases > 0) { t -= 10; ases--; }
  return t;
}

function fecharRodada(s) {
  s.fase = 'resultado';
  if (s.jog.some((m) => total(m) <= 21)) while (total(s.banca) < 17) s.banca.push(s.baralho.pop());
  const bt = total(s.banca), natB = s.banca.length === 2 && bt === 21;
  s.res = s.jog.map((m) => {
    const jt = total(m), natJ = m.length === 2 && jt === 21;
    if (jt > 21) return 'derrota';
    if (natJ && !natB) return 'blackjack';
    if (natB && !natJ) return 'derrota';
    if (bt > 21 || jt > bt) return 'vitoria';
    return jt < bt ? 'derrota' : 'empate';
  });
  s.pontos = s.pontos.map((p, i) => p + PTS[s.res[i]]);
}
function normalizar(s) {
  while (s.vez < s.jog.length && total(s.jog[s.vez]) >= 21) s.vez++;
  if (s.vez >= s.jog.length) fecharRodada(s);
  return s;
}
function nova(n, rodada, pontos) {
  const s = { baralho: embaralhar(baralho()), jog: Array.from({ length: n }, () => []), banca: [], vez: 0, fase: 'jogando', rodada, pontos, res: [] };
  for (let k = 0; k < 2; k++) { s.jog.forEach((m) => m.push(s.baralho.pop())); s.banca.push(s.baralho.pop()); }
  return normalizar(s);
}

export default function Blackjack({ modo, aoTerminar }) {
  const n = modo === 'dois' ? 2 : 1;
  const [s, setS] = useState(() => nova(n, 1, Array(n).fill(0)));
  const enviado = useRef(false);
  const nome = (i) => (n === 1 ? 'Você' : `Jogador ${i + 1}`);

  const pedir = () => setS((p) => { if (p.fase !== 'jogando') return p; const c = structuredClone(p); c.jog[c.vez].push(c.baralho.pop()); return normalizar(c); });
  const parar = () => setS((p) => { if (p.fase !== 'jogando') return p; const c = structuredClone(p); c.vez++; return normalizar(c); });
  const proxima = () => setS((p) => (p.rodada < RODADAS ? nova(n, p.rodada + 1, p.pontos) : { ...p, fase: 'fim' }));
  const reiniciar = () => { enviado.current = false; setS(nova(n, 1, Array(n).fill(0))); };

  useEffect(() => {
    if (s.fase !== 'fim' || enviado.current) return;
    enviado.current = true;
    const [a, b] = s.pontos;
    aoTerminar?.({ pontos: a, vitoria: n === 2 ? (a === b ? null : a > b) : null, detalhes: { pontos: s.pontos, rodadas: RODADAS } });
  }, [s.fase]); // eslint-disable-line react-hooks/exhaustive-deps

  const escondida = s.fase === 'jogando';
  const jogando = s.fase === 'jogando';
  return (
    <div className="j-mesa">
      <div className="linha"><b>Rodada {Math.min(s.rodada, RODADAS)} de {RODADAS}</b>
        <span>{s.pontos.map((p, i) => <span className="tag ok" key={i}>{nome(i)}: {p} pts</span>)}</span></div>

      <section aria-label="Banca" className="j-bloco">
        <small>Banca {escondida ? '' : `· ${total(s.banca)}`}</small>
        <div className="j-mao">{s.banca.map((c, i) => <Carta key={i} c={c} baixo={escondida && i === 1} largura="68px" />)}</div>
      </section>

      {s.jog.map((m, i) => (
        <section key={i} aria-label={nome(i)} className={`j-bloco${jogando && s.vez === i ? ' ativo' : ''}`}>
          <small>{nome(i)} · {total(m)}{total(m) > 21 ? ' (estourou)' : ''}{s.fase === 'resultado' && <b> · {ROTULO[s.res[i]]}</b>}</small>
          <div className="j-mao">{m.map((c, k) => <Carta key={k} c={c} largura="68px" />)}</div>
        </section>
      ))}

      <div className="j-acoes">
        {jogando && <>
          <span role="status">{n === 2 ? `Vez de ${nome(s.vez)}` : 'Sua vez'}</span>
          <button className="btn p" onClick={pedir}>Pedir carta</button>
          <button className="btn o" onClick={parar}>Parar</button>
        </>}
        {s.fase === 'resultado' && <button className="btn p" onClick={proxima}>{s.rodada < RODADAS ? 'Próxima rodada' : 'Ver resultado final'}</button>}
        {s.fase === 'fim' && <>
          <p role="status" className="j-final">{n === 1 ? `Você fez ${s.pontos[0]} pontos em ${RODADAS} rodadas.` : s.pontos[0] === s.pontos[1] ? `Empate: ${s.pontos[0]} a ${s.pontos[1]}.` : `${nome(s.pontos[0] > s.pontos[1] ? 0 : 1)} venceu: ${s.pontos[0]} a ${s.pontos[1]}.`}</p>
          <button className="btn p" onClick={reiniciar}>Jogar de novo</button>
        </>}
      </div>
      <p className="j-dica">Vitória vale 2 pontos, empate 1 e Blackjack 3. A banca compra até 17.</p>
    </div>
  );
}
