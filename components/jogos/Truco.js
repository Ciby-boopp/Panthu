'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Carta from './Carta';
import GritoTruco from './GritoTruco';
import { EFEITOS, definirVoz, destravarAudio, gritar, somPato, lerPrefs, salvarPrefs, vozLigada } from '@/lib/efeitosTruco';
import { lerGrito } from '@/lib/gritoGravado';
import { intensidade } from '@/lib/musicaJogos';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';
import { ligarPresenca } from '@/lib/presencaJogo';
import { idCarta } from '@/lib/cartas';
import { NOME_AUMENTO, PROX, aplicar, decidirIA, manilhaDe, novoJogo, podeRedistribuir, visao } from '@/lib/truco';

export default function Truco({ modo, aoTerminar, auto }) {
  return modo === 'solo' && !auto ? <TrucoSolo aoTerminar={aoTerminar} /> : <TrucoOnline aoTerminar={aoTerminar} auto={auto} />;
}

// Avisa o painel (uma vez) quando a partida acaba.
function useFimDeJogo(s, seat, aoTerminar, extra = {}) {
  const enviado = useRef(false);
  useEffect(() => {
    if (s && s.fase !== 'fimJogo') enviado.current = false;
    if (!s || s.fase !== 'fimJogo' || enviado.current) return;
    enviado.current = true;
    const venceu = s.vencedorMao === seat;
    aoTerminar?.({ pontos: venceu ? 12 : s.placar[seat], vitoria: venceu, detalhes: { placar: s.placar, ...extra } });
  }, [s, seat, aoTerminar]);
  return enviado;
}

function TrucoSolo({ aoTerminar }) {
  const [s, setS] = useState(() => novoJogo());
  const enviado = useFimDeJogo(s, 0, aoTerminar);
  const agir = useCallback((a) => setS((p) => aplicar(p, { ...a, seat: 0 })), []);
  useEffect(() => {
    if (s.fase !== 'jogando') return;
    const t = setTimeout(() => { const a = decidirIA(s, 1); if (a) setS((p) => aplicar(p, a)); }, 900);
    return () => clearTimeout(t);
  }, [s]);
  return <MesaTruco s={s} seat={0} agir={agir} nomes={['Você', 'Computador']} onNovo={() => { enviado.current = false; setS(novoJogo()); }} />;
}

function TrucoOnline({ aoTerminar, auto }) {
  const [etapa, setEtapa] = useState('menu'); // menu | esperando | jogando
  const [codigo, setCodigo] = useState('');
  const [entrada, setEntrada] = useState('');
  const [seat, setSeat] = useState(null);
  const [s, setS] = useState(null);
  const sRef = useRef(null);
  const canal = useRef(null);
  const sb = useRef(null);
  const pres = useRef(null);
  const audioOp = useRef(null); // grito gravado do oponente (chega um instante antes da jogada)
  const enviado = useFimDeJogo(s, seat ?? 0, aoTerminar, { online: true });
  // Envia meu grito gravado (se eu tiver) ao oponente. Só vale para o primeiro TRUCO (6, 9 e 12 usam a voz de sempre).
  const enviarGrito = () => {
    const url = lerGrito();
    if (url && url.length < 150000) canal.current?.send({ type: 'broadcast', event: 'grito', payload: { audio: url } });
  };
  // Patinho: só o barulho de pato (nunca a gravação). O oponente também ouve o "quá".
  const ultimoPato = useRef(0);
  const [rizada, setRizada] = useState(0); // risada recebida do oponente (aparece na tela)
  const enviarPato = () => {
    const t = Date.now();
    if (t - ultimoPato.current < 1500) return;
    ultimoPato.current = t;
    canal.current?.send({ type: 'broadcast', event: 'pato', payload: {} });
  };
  const enviarRiso = () => {
    const t = Date.now();
    if (t - ultimoPato.current < 1500) return;
    ultimoPato.current = t;
    canal.current?.send({ type: 'broadcast', event: 'riso', payload: {} });
  };

  useEffect(() => () => { if (pres.current) pres.current.sair(); else if (canal.current && sb.current) sb.current.removeChannel(canal.current); }, []);

  const publicar = () => {
    setS(sRef.current); setEtapa('jogando');
    canal.current?.send({ type: 'broadcast', event: 'estado', payload: visao(sRef.current, 1) });
  };
  const aplicarNoAnfitriao = (a) => { sRef.current = aplicar(sRef.current, a); publicar(); };

  const conectar = (cod, lugar) => {
    sb.current = criarCliente();
    const ch = sb.current.channel(`truco-${cod}`, { config: { broadcast: { self: false } } });
    canal.current = ch;
    pres.current = ligarPresenca(sb.current, ch);
    setCodigo(cod); setSeat(lugar);
    ch.on('broadcast', { event: 'grito' }, ({ payload }) => {
      const a = payload?.audio;
      if (typeof a !== 'string' || !a.startsWith('data:audio/') || a.length > 200000) return;
      audioOp.current = { url: a, t: Date.now() };
    });
    ch.on('broadcast', { event: 'pato' }, () => { if (vozLigada()) somPato(2); });
    ch.on('broadcast', { event: 'riso' }, () => setRizada(Date.now()));
    if (lugar === 0) {
      ch.on('broadcast', { event: 'entrou' }, () => { if (!sRef.current) sRef.current = novoJogo(); publicar(); })
        .on('broadcast', { event: 'acao' }, ({ payload }) => aplicarNoAnfitriao({ ...payload, seat: 1 }));
    } else {
      ch.on('broadcast', { event: 'estado' }, ({ payload }) => { setS(payload); setEtapa('jogando'); });
    }
    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      pres.current?.aoInscrever();
      if (lugar === 0) setEtapa('esperando');
      else { setEtapa('esperando'); ch.send({ type: 'broadcast', event: 'entrou', payload: {} }); }
    });
  };
  // Partida combinada por convite: entra direto na sala, sem digitar código.
  useEffect(() => { if (auto) { sRef.current = null; conectar(auto.sala, auto.seat); } }, [auto?.sala, auto?.seat]); // eslint-disable-line react-hooks/exhaustive-deps
  // O convidado repete o aviso até receber o estado (caso o anfitrião ainda não estivesse pronto).
  useEffect(() => {
    if (seat !== 1 || etapa !== 'esperando') return;
    const t = setInterval(() => canal.current?.send({ type: 'broadcast', event: 'entrou', payload: {} }), 2000);
    return () => clearInterval(t);
  }, [seat, etapa]);

  const agir = (a) => {
    if (seat === 0) aplicarNoAnfitriao({ ...a, seat: 0 });
    else canal.current?.send({ type: 'broadcast', event: 'acao', payload: a });
  };

  if (etapa === 'menu') {
    return (
      <div className="j-mesa">
        <h3>Truco online (2 jogadores)</h3>
        <p style={{ color: 'var(--suave)' }}>Um jogador cria a sala e passa o código para o outro entrar.</p>
        <div className="j-acoes"><button className="btn p" onClick={() => { const cod = Math.random().toString(36).slice(2, 6).toUpperCase(); sRef.current = null; conectar(cod, 0); }}>Criar sala</button></div>
        <form className="campo" onSubmit={(e) => { e.preventDefault(); const c = entrada.trim().toUpperCase(); if (c.length >= 4) conectar(c, 1); }}>
          <label htmlFor="cod">Ou entre com um código</label>
          <div className="linha" style={{ flexWrap: 'nowrap' }}>
            <input id="cod" value={entrada} onChange={(e) => setEntrada(e.target.value)} maxLength={6} placeholder="Ex.: K7QZ" autoCapitalize="characters" autoComplete="off" />
            <button className="btn s" type="submit" disabled={entrada.trim().length < 4}>Entrar</button>
          </div>
        </form>
      </div>
    );
  }
  if (etapa === 'esperando' || !s) {
    return (
      <div className="j-mesa" style={{ textAlign: 'center' }}>
        {seat === 0 ? <><p>Código da sala</p><p className="j-codigo" aria-live="polite">{codigo}</p><p style={{ color: 'var(--suave)' }}>Aguardando o outro jogador entrar…</p></> : <p role="status">Entrando na sala {codigo}…</p>}
      </div>
    );
  }
  const nomes = seat === 0 ? ['Você', 'Oponente'] : ['Oponente', 'Você'];
  return <MesaTruco s={s} seat={seat} agir={agir} nomes={nomes} audioOp={audioOp} enviarGrito={enviarGrito} enviarPato={enviarPato} enviarRiso={enviarRiso} rizada={rizada} onNovo={() => agir({ t: 'novo' })} />;
}

function MesaTruco({ s, seat, agir, nomes, onNovo, audioOp, enviarGrito, enviarPato, enviarRiso, rizada }) {
  const op = 1 - seat;
  const [grito, setGrito] = useState(null);
  const ant = useRef(null);
  const [mudo, setMudo] = useState(false);
  const [riso, setRiso] = useState(0);
  useEffect(() => { if (!rizada) return; setRiso(rizada); const t = setTimeout(() => setRiso(0), 3000); return () => clearTimeout(t); }, [rizada]);
  const rir = () => { if (enviarRiso) enviarRiso(); else { setRiso(Date.now()); setTimeout(() => setRiso(0), 3000); } }; // contra o computador, aparece na própria tela
  const [zp, setZp] = useState({ efeito: 'normal', sons: true, anim: true });
  useEffect(() => { setMudo(!vozLigada()); setZp(lerPrefs()); }, []);
  // Celulares só liberam o som depois do primeiro toque: destrava no primeiro toque na mesa.
  useEffect(() => {
    const d = () => destravarAudio();
    window.addEventListener('pointerdown', d, { once: true });
    return () => window.removeEventListener('pointerdown', d);
  }, []);
  useEffect(() => { intensidade(s.pedido ? 1 : 0); return () => intensidade(0); }, [!!s.pedido]); // eslint-disable-line react-hooks/exhaustive-deps
  const mudarZ = (n) => { const novo = { ...zp, ...n }; setZp(novo); salvarPrefs(novo); };
  // Detecta o que acabou de acontecer na mesa e mostra a tela do grito (truco, quero ou correu).
  useEffect(() => {
    const a = ant.current; ant.current = s;
    if (s.pedido && (!a || !a.pedido || a.pedido.para !== s.pedido.para || a.n !== s.n)) {
      setGrito({ id: `${s.n}-${s.pedido.de}-${s.pedido.para}-${Date.now()}`, texto: NOME_AUMENTO[s.pedido.para].toUpperCase(), quem: s.pedido.de === seat ? 'Você gritou!' : `${nomes[s.pedido.de]} gritou!`, tipo: 'truco', meu: s.pedido.de === seat, primeiro: s.pedido.para === 3 });
    } else if (a && a.pedido && !s.pedido && s.fase === 'jogando' && s.valor > a.valor) {
      setGrito({ id: `q-${Date.now()}`, texto: 'QUERO!', quem: a.pedido.de === seat ? `${nomes[1 - seat]} aceitou` : 'Você aceitou', tipo: 'quero', meu: a.pedido.de !== seat });
    } else if (a && a.fase === 'jogando' && s.fase !== 'jogando' && s.motivo === 'correu') {
      setGrito({ id: `c-${Date.now()}`, texto: 'CORREU!', quem: s.vencedorMao === seat ? `${nomes[1 - seat]} correu` : 'Você correu', tipo: 'correu', meu: s.vencedorMao !== seat });
    }
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const jogando = s.fase === 'jogando';
  const minhaVez = jogando && !s.pedido && s.vez === seat;
  const pedidoParaMim = jogando && s.pedido && s.pedido.de !== seat;
  const podeTruco = minhaVez && !s.semTruco && s.valor < 12 && s.ultimo !== seat;

  let status;
  if (s.fase === 'fimJogo') status = s.vencedorMao === seat ? '🏆 Você venceu a partida!' : `${nomes[op]} venceu a partida.`;
  else if (s.fase === 'fimMao') {
    const ganhei = s.vencedorMao === seat;
    status = `${ganhei ? 'Você ganhou' : `${nomes[op]} ganhou`} a mão (+${s.ptsMao})${s.motivo === 'correu' ? ` — ${ganhei ? nomes[op] : 'você'} correu` : ''}.`;
  } else if (s.pedido) status = pedidoParaMim ? `${nomes[op]} pede ${NOME_AUMENTO[s.pedido.para]} (vale ${s.pedido.para})` : `Você pediu ${NOME_AUMENTO[s.pedido.para]} Aguardando resposta…`;
  else status = s.vez === seat ? 'Sua vez' : `Vez de ${nomes[op]}…`;

  const rotuloVaza = (k) => (s.res[k] === undefined ? '' : s.res[k] === 'e' ? 'Empate' : s.res[k] === seat ? 'Sua' : 'Dele');
  return (
    <div className="j-mesa">
      <GritoTruco grito={grito} audioOp={audioOp} />
      {riso > 0 && <div className="riso-tela" key={riso} aria-hidden="true">{[8, 22, 36, 50, 64, 78, 90, 15, 70].map((x, i) => <span key={i} style={{ left: `${x}%`, animationDelay: `${(i % 5) * 0.18}s`, fontSize: `${44 + (i % 3) * 18}px` }}>😂</span>)}</div>}
      <div className="j-placar">
        <div><small>{nomes[op]}</small><b>{s.placar[op]}</b></div>
        <div className="j-valor">Mão {s.n} · vale <b>{s.valor}</b></div>
        <div><small>{nomes[seat]}</small><b>{s.placar[seat]}</b></div>
      </div>
      <div className="j-mao" aria-label={`Cartas de ${nomes[op]}`}>{s.maos[op].map((_, i) => <Carta key={i} baixo largura="52px" />)}</div>
      <div className="j-centro">
        <div className="j-reacoes">
          <button type="button" className="pato-btn" aria-label="Fazer quá" title="Quá!" onClick={() => { destravarAudio(); if (vozLigada()) { somPato(2); enviarPato?.(); } }}>
            <span aria-hidden="true">🦆</span><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 8q4 4 0 8M10 5q7 7 0 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </button>
          <button type="button" className="pato-btn riso-btn" aria-label="Mandar risada" title="Rir 😂" onClick={rir}><span aria-hidden="true">😂</span></button>
        </div>
        <div className="j-vira"><small>Vira</small><Carta c={s.vira} largura="56px" /><small>Manilha: {manilhaDe(s.vira)}</small></div>
        <div className="j-vazas">
          {s.mesa.map((vz, k) => (
            <div key={k} className="j-vaza">
              {vz[op] ? <Carta c={vz[op]} largura="52px" /> : <span className="j-vazio" />}
              {vz[seat] ? <Carta c={vz[seat]} largura="52px" /> : <span className="j-vazio" />}
              <small>{rotuloVaza(k) || `${k + 1}ª`}</small>
            </div>
          ))}
        </div>
      </div>
      {s.msg && jogando && <p className="j-dica">{s.msg}</p>}
      <p className="j-status" role="status">{status}</p>
      <div className="j-acoes">
        {pedidoParaMim && <>
          <button className="btn p" onClick={() => agir({ t: 'aceitar' })}>Quero!</button>
          <button className="btn perigo" onClick={() => agir({ t: 'correr' })}>Correr</button>
          {s.pedido.para < 12 && <button className="btn ouro grita" onClick={() => { agir({ t: 'aumentar' }); }}>🗣️ GRITAR {NOME_AUMENTO[PROX[s.pedido.para]].toUpperCase()}</button>}
        </>}
        {podeTruco && <button className="btn ouro grita" onClick={() => { if (PROX[s.valor] === 3) enviarGrito?.(); agir({ t: 'truco' }); }}>🗣️ GRITAR {NOME_AUMENTO[PROX[s.valor]].toUpperCase()}</button>}
        {s.fase === 'fimMao' && <button className="btn p" onClick={() => agir({ t: 'proxima' })}>Próxima mão</button>}
        {s.fase === 'fimJogo' && onNovo && <button className="btn p" onClick={onNovo}>🔄 Jogar novamente</button>}
        {minhaVez && <button className="btn perigo" onClick={() => agir({ t: podeRedistribuir(s, seat) ? 'redistribuir' : 'correr' })}>Correr</button>}
      </div>
      <div className="j-mao" aria-label="Suas cartas">
        {s.maos[seat].map((c, i) => <Carta key={idCarta(c)} c={c} largura="76px" onClick={() => agir({ t: 'jogar', i })} desabilitada={!minhaVez} />)}
      </div>
      <details className="j-zoeira">
        <summary>🎭 Zoeira e sons</summary>
        <label><input type="checkbox" checked={!mudo} onChange={(e) => { setMudo(!e.target.checked); definirVoz(e.target.checked); }} /> Grito em voz alta (som)</label>
        <label>Efeito na voz
          <select value={zp.efeito} onChange={(e) => mudarZ({ efeito: e.target.value })} disabled={mudo}>
            {EFEITOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={zp.sons} onChange={(e) => mudarZ({ sons: e.target.checked })} disabled={mudo} /> Sons de pato e engraçados</label>
        <label><input type="checkbox" checked={zp.anim} onChange={(e) => mudarZ({ anim: e.target.checked })} /> Animações engraçadas</label>
        <button type="button" className="btn o mini" disabled={mudo} onClick={() => { destravarAudio(); gritar('TRUCO!', 'truco'); }}>▶ Testar o som</button>
        <p className="j-dica">Quer gritar com a sua própria voz? <Link href="/app/configuracoes">Grave nas Configurações</Link>. A sua voz grita só o primeiro TRUCO; o patinho 🦆 faz só “quá”.</p>
      </details>
      <p className="j-dica">Truco paulista: manilhas são a carta depois do vira (♣ zap &gt; ♥ &gt; ♠ &gt; ♦). Ganha a mão quem fizer 2 vazas. Vale 1 ponto, e sobe para 3, 6, 9 e 12. Se você não quiser aceitar, pode correr: quem pediu leva os pontos da rodada anterior. Mão de onze vale 3 e não tem truco. Primeiro a chegar em 12 vence.</p>
    </div>
  );
}
