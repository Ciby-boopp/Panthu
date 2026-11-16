'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import SalaDuelo from './SalaDuelo';
import { PECAS, TEXTO_FIM, aplicarMov, emXeque, inicial, lanceComputador, legais, nomeCasa, situacao } from '@/lib/xadrez';

export default function Xadrez({ modo, aoTerminar, auto }) {
  if (modo === 'solo' && !auto) return <XadrezSolo aoTerminar={aoTerminar} />;
  return (
    <SalaDuelo jogo="xadrez" titulo="Xadrez" auto={auto} novaCfg={() => ({ brancas: Math.random() < 0.5 ? 0 : 1 })}>
      {({ cfg, seat, enviar, ouvir }) => <Partida key={cfg.brancas} online cor={cfg.brancas === seat ? 'w' : 'b'} enviar={enviar} ouvir={ouvir} aoTerminar={aoTerminar} />}
    </SalaDuelo>
  );
}

function XadrezSolo({ aoTerminar }) {
  const [nivel, setNivel] = useState(null);
  if (!nivel) {
    return (
      <div className="j-mesa" style={{ textAlign: 'center' }}>
        <h3>Escolha o nível do computador</h3>
        <div className="j-acoes">{[[1, 'Fácil'], [2, 'Médio'], [3, 'Difícil']].map(([n, t]) => <button key={n} className="btn s" onClick={() => setNivel(n)}>{t}</button>)}</div>
      </div>
    );
  }
  return <Partida key={nivel} nivel={nivel} cor="w" aoTerminar={aoTerminar} trocar={() => setNivel(null)} />;
}

function Partida({ online = false, cor, nivel = 2, enviar, ouvir, aoTerminar, trocar }) {
  const [s, setS] = useState(() => inicial());
  const [sel, setSel] = useState(null);
  const [promo, setPromo] = useState(null); // lances de promoção pendentes
  const [fimManual, setFimManual] = useState(null); // 'eu-desisti' | 'ele-desistiu'
  const [msg, setMsg] = useState('');
  const enviado = useRef(false);
  const sit = useMemo(() => situacao(s), [s]);
  const acabou = !['jogando', 'xeque'].includes(sit) || !!fimManual;
  const minhaVez = s.vez === cor && !acabou;
  const vira = cor === 'b'; // pretas jogam com o tabuleiro invertido
  const alvos = useMemo(() => (sel !== null ? legais(s, sel) : []), [s, sel]);

  // Lance do amigo.
  useEffect(() => {
    if (!online) return;
    const off1 = ouvir('jogada', (p) => setS((atual) => {
      const m = legais(atual, p.de).find((x) => x.para === p.para && (x.promo || null) === (p.promo || null));
      return m && atual.vez !== cor ? aplicarMov(atual, m) : atual;
    }));
    const off2 = ouvir('desistir', () => setFimManual('ele-desistiu'));
    return () => { off1(); off2(); };
  }, [online, ouvir, cor]);

  // Computador joga de pretas.
  useEffect(() => {
    if (online || acabou || s.vez === cor) return;
    const t = setTimeout(() => { const m = lanceComputador(s, nivel); if (m) setS(aplicarMov(s, m)); }, 500);
    return () => clearTimeout(t);
  }, [s, online, acabou, cor, nivel]);

  // Resultado final (uma vez).
  const venceu = fimManual === 'ele-desistiu' ? true : fimManual === 'eu-desisti' ? false : sit === 'mate' ? s.vez !== cor : null;
  useEffect(() => {
    if (!acabou || enviado.current) return;
    enviado.current = true;
    aoTerminar?.({ pontos: venceu === true ? 100 : venceu === null ? 50 : 10, vitoria: venceu, detalhes: { online, lances: s.num, fim: fimManual || sit } });
  }, [acabou]); // eslint-disable-line react-hooks/exhaustive-deps

  const jogar = (m) => {
    setS((a) => aplicarMov(a, m)); setSel(null); setPromo(null); setMsg('');
    if (online) enviar('jogada', { de: m.de, para: m.para, promo: m.promo || null });
  };
  const tocar = (i) => {
    if (!minhaVez) return;
    if (sel !== null) {
      const ms = alvos.filter((m) => m.para === i);
      if (ms.length > 1) { setPromo(ms); return; }
      if (ms.length === 1) { jogar(ms[0]); return; }
    }
    if (s.b[i]?.[0] === cor && legais(s, i).length) setSel(i); else { setSel(null); if (s.b[i]) setMsg('Essa peça não pode se mover agora.'); }
  };
  const desistir = () => { if (acabou) return; setFimManual('eu-desisti'); if (online) enviar('desistir'); };
  const novo = () => { enviado.current = false; setS(inicial()); setSel(null); setPromo(null); setFimManual(null); setMsg(''); };

  const ordem = Array.from({ length: 64 }, (_, k) => (vira ? 63 - k : k));
  let status;
  if (fimManual === 'eu-desisti') status = 'Você desistiu. O adversário venceu.';
  else if (fimManual === 'ele-desistiu') status = '🏆 O adversário desistiu. Você venceu!';
  else if (sit === 'mate') status = s.vez === cor ? 'Xeque-mate. Você perdeu.' : '🏆 Xeque-mate! Você venceu!';
  else if (acabou) status = TEXTO_FIM[sit];
  else status = `${minhaVez ? 'Sua vez' : online ? 'Vez do adversário…' : 'O computador está pensando…'}${sit === 'xeque' ? ' — XEQUE!' : ''}`;
  const reiXeque = emXeque(s) ? s.b.indexOf(s.vez + 'K') : -1;

  return (
    <div className="j-mesa">
      <div className="linha">
        <span><span className="tag ok">Você: {cor === 'w' ? 'brancas' : 'pretas'}</span><span className="tag">Lance {s.num}</span></span>
        <span>{!acabou && <button className="btn o mini" onClick={desistir}>Desistir</button>}</span>
      </div>
      <div className="xz-tab" role="grid" aria-label="Tabuleiro de xadrez">
        {ordem.map((i) => {
          const r = i >> 3, c = i & 7, x = s.b[i];
          const alvo = alvos.find((m) => m.para === i);
          return (
            <button key={i} role="gridcell" className={`xz-casa ${(r + c) % 2 ? 'esc' : 'cla'} ${sel === i ? 'sel' : ''} ${alvo ? 'alvo' : ''} ${s.ultimo && (s.ultimo.de === i || s.ultimo.para === i) ? 'ult' : ''} ${reiXeque === i ? 'xeque' : ''}`}
              onClick={() => tocar(i)} aria-label={`${nomeCasa(i)}${x ? ', ' + PECAS[x] : ''}`}>
              {x && <span className={`xz-peca ${x[0] === 'w' ? 'b' : 'p'}`}>{PECAS['b' + x[1]] + '\uFE0E'}</span>}
            </button>
          );
        })}
      </div>
      {promo && (
        <div className="j-acoes" role="group" aria-label="Promover o peão">
          <b>Promover o peão para:</b>
          {promo.map((m) => <button key={m.promo} className="btn s mini" onClick={() => jogar(m)}>{PECAS['b' + m.promo] + '\uFE0E'} {({ Q: 'Dama', R: 'Torre', B: 'Bispo', N: 'Cavalo' })[m.promo]}</button>)}
        </div>
      )}
      <p className="j-status" role="status">{status}</p>
      {msg && <p className="j-dica">{msg}</p>}
      {acabou && !online && <div className="j-acoes"><button className="btn p" onClick={novo}>Jogar de novo</button><button className="btn o" onClick={trocar}>Mudar o nível</button></div>}
      <p className="j-dica">Regras oficiais: roque, en passant, promoção, xeque, xeque-mate, afogamento, regra dos 50 lances e repetição tripla. Toque na peça e depois na casa de destino.</p>
    </div>
  );
}
