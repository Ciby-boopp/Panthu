'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import SalaDuelo from './SalaDuelo';
import DueloCorrida from './DueloCorrida';
import { gerar, linha, TAM } from '@/lib/cacapalavras';

export default function CacaPalavras({ modo, aoTerminar, auto }) {
  if (modo === 'solo' && !auto) return <Solo aoTerminar={aoTerminar} />;
  return (
    <SalaDuelo jogo="cacapalavras" titulo="Caça-palavras" auto={auto} novaCfg={() => ({ semente: Math.floor(Math.random() * 1e9) })}>
      {({ cfg, enviar, ouvir, revanche }) => (
        <DueloCorrida enviar={enviar} ouvir={ouvir} aoTerminar={aoTerminar} revanche={revanche}
          comparar={(a, b) => (a.achadas !== b.achadas ? a.achadas - b.achadas : a.seg === b.seg ? 0 : b.seg - a.seg)}
          resumo={(r) => `${r.achadas} palavras em ${Math.floor(r.seg / 60)}:${String(r.seg % 60).padStart(2, '0')}`}
          renderJogo={({ aoFim, aoProgresso, ele, terminou }) => <Tabuleiro semente={cfg.semente} aoFim={aoFim} aoProgresso={aoProgresso} ele={ele} bloqueado={terminou} />} />
      )}
    </SalaDuelo>
  );
}

function Solo({ aoTerminar }) {
  const [semente, setSemente] = useState(() => Math.floor(Math.random() * 1e9));
  return (<>
    <Tabuleiro key={semente} semente={semente} aoFim={(r) => aoTerminar?.({ pontos: r.pontos, vitoria: r.achadas === r.total ? true : null, detalhes: { achadas: r.achadas, segundos: r.seg } })} />
    <div className="j-acoes"><button className="btn p" onClick={() => setSemente(Math.floor(Math.random() * 1e9))}>🔄 Jogar novamente</button></div>
  </>);
}

function Tabuleiro({ semente, aoFim, aoProgresso, ele, bloqueado }) {
  const { grade, palavras } = useMemo(() => gerar(semente), [semente]);
  const [inicio, setInicio] = useState(null);
  const [achadas, setAchadas] = useState([]); // { palavra, celulas }
  const [seg, setSeg] = useState(0);
  const [ultima, setUltima] = useState(0);
  const [fim, setFim] = useState(false);
  const [dica, setDica] = useState('');
  const enviado = useRef(false);
  const parar = fim || bloqueado;

  useEffect(() => { if (parar) return; const t = setInterval(() => setSeg((x) => x + 1), 1000); return () => clearInterval(t); }, [parar]);
  useEffect(() => { if (achadas.length === palavras.length) setFim(true); }, [achadas, palavras]);
  useEffect(() => {
    if (!fim || enviado.current) return;
    enviado.current = true;
    const bonus = achadas.length === palavras.length ? Math.max(0, 300 - seg) : 0;
    aoFim({ achadas: achadas.length, total: palavras.length, seg: ultima || seg, pontos: achadas.length * 100 + bonus });
  }, [fim]); // eslint-disable-line react-hooks/exhaustive-deps

  const marcadas = new Set(achadas.flatMap((a) => a.celulas.map(([l, c]) => l * TAM + c)));
  const tocar = (l, c) => {
    if (parar) return;
    if (!inicio) { setInicio([l, c]); setDica(''); return; }
    if (inicio[0] === l && inicio[1] === c) { setInicio(null); return; }
    const cel = linha(inicio, [l, c]);
    setInicio(null);
    if (!cel) { setDica('As letras da palavra ficam em linha reta (horizontal, vertical ou diagonal).'); return; }
    const txt = cel.map(([a, b]) => grade[a][b]).join('');
    const p = palavras.find((w) => !achadas.some((x) => x.palavra === w) && (w === txt || w === [...txt].reverse().join('')));
    if (!p) { setDica('Essa sequência não é uma das palavras da lista.'); return; }
    setAchadas((a) => [...a, { palavra: p, celulas: cel }]); setUltima(seg); setDica('');
    aoProgresso?.({ achadas: achadas.length + 1, total: palavras.length });
  };
  const mm = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  return (
    <div className="j-mesa">
      <div className="linha">
        <span><span className="tag">⏱ {mm}</span><span className="tag ok">Achadas: {achadas.length}/{palavras.length}</span>{ele && <span className="tag">Amigo: {ele.achadas}/{ele.total}</span>}</span>
        <button className="btn o mini" onClick={() => setFim(true)} disabled={parar}>Terminar</button>
      </div>
      <div className="cp-grade" style={{ '--n': TAM }} role="grid" aria-label="Caça-palavras">
        {grade.map((linhaG, l) => linhaG.map((ch, c) => (
          <button key={`${l}-${c}`} role="gridcell" className={`cp-cel ${marcadas.has(l * TAM + c) ? 'ok' : ''} ${inicio && inicio[0] === l && inicio[1] === c ? 'ini' : ''}`} onClick={() => tocar(l, c)} aria-label={`Letra ${ch}, linha ${l + 1}, coluna ${c + 1}`}>{ch}</button>
        )))}
      </div>
      <div className="cp-lista" aria-label="Palavras para encontrar">
        {palavras.map((p) => <span key={p} className={`tag ${achadas.some((x) => x.palavra === p) ? 'ok cp-feita' : ''}`}>{p}</span>)}
      </div>
      <p className="j-dica" role="status">{dica || 'Toque na primeira letra e depois na última letra da palavra. Vale de trás para frente e na diagonal.'}</p>
      {fim && !bloqueado && <p className="j-final" role="status">{achadas.length === palavras.length ? `Você achou todas em ${mm}!` : `Fim: ${achadas.length} de ${palavras.length} palavras.`}</p>}
    </div>
  );
}
