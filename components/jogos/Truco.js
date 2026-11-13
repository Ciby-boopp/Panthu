'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Carta from './Carta';
import { criarCliente } from '@/lib/supabase/client';
import { idCarta } from '@/lib/cartas';
import { NOME_AUMENTO, PROX, aplicar, decidirIA, manilhaDe, novoJogo, visao } from '@/lib/truco';

export default function Truco({ modo, aoTerminar }) {
  return modo === 'solo' ? <TrucoSolo aoTerminar={aoTerminar} /> : <TrucoOnline aoTerminar={aoTerminar} />;
}

// Avisa o painel (uma vez) quando a partida acaba.
function useFimDeJogo(s, seat, aoTerminar) {
  const enviado = useRef(false);
  useEffect(() => {
    if (!s || s.fase !== 'fimJogo' || enviado.current) return;
    enviado.current = true;
    const venceu = s.vencedorMao === seat;
    aoTerminar?.({ pontos: venceu ? 12 : s.placar[seat], vitoria: venceu, detalhes: { placar: s.placar } });
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

function TrucoOnline({ aoTerminar }) {
  const [etapa, setEtapa] = useState('menu'); // menu | esperando | jogando
  const [codigo, setCodigo] = useState('');
  const [entrada, setEntrada] = useState('');
  const [seat, setSeat] = useState(null);
  const [s, setS] = useState(null);
  const sRef = useRef(null);
  const canal = useRef(null);
  const sb = useRef(null);
  const enviado = useFimDeJogo(s, seat ?? 0, aoTerminar);

  useEffect(() => () => { if (canal.current && sb.current) sb.current.removeChannel(canal.current); }, []);

  const publicar = () => {
    setS(sRef.current); setEtapa('jogando');
    canal.current?.send({ type: 'broadcast', event: 'estado', payload: visao(sRef.current, 1) });
  };
  const aplicarNoAnfitriao = (a) => { sRef.current = aplicar(sRef.current, a); publicar(); };

  const conectar = (cod, lugar) => {
    sb.current = criarCliente();
    const ch = sb.current.channel(`truco-${cod}`, { config: { broadcast: { self: false } } });
    canal.current = ch;
    setCodigo(cod); setSeat(lugar);
    if (lugar === 0) {
      ch.on('broadcast', { event: 'entrou' }, () => { if (!sRef.current) sRef.current = novoJogo(); publicar(); })
        .on('broadcast', { event: 'acao' }, ({ payload }) => aplicarNoAnfitriao({ ...payload, seat: 1 }));
    } else {
      ch.on('broadcast', { event: 'estado' }, ({ payload }) => { setS(payload); setEtapa('jogando'); });
    }
    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      if (lugar === 0) setEtapa('esperando');
      else { setEtapa('esperando'); ch.send({ type: 'broadcast', event: 'entrou', payload: {} }); }
    });
  };
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
  return <MesaTruco s={s} seat={seat} agir={agir} nomes={nomes} onNovo={null} />;
}

function MesaTruco({ s, seat, agir, nomes, onNovo }) {
  const op = 1 - seat;
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
      <div className="j-placar">
        <div><small>{nomes[op]}</small><b>{s.placar[op]}</b></div>
        <div className="j-valor">Mão {s.n} · vale <b>{s.valor}</b></div>
        <div><small>{nomes[seat]}</small><b>{s.placar[seat]}</b></div>
      </div>
      <div className="j-mao" aria-label={`Cartas de ${nomes[op]}`}>{s.maos[op].map((_, i) => <Carta key={i} baixo largura="52px" />)}</div>
      <div className="j-centro">
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
          <button className="btn p" onClick={() => agir({ t: 'aceitar' })}>Aceitar</button>
          <button className="btn perigo" onClick={() => agir({ t: 'correr' })}>Correr</button>
          {s.pedido.para < 12 && <button className="btn ouro" onClick={() => agir({ t: 'aumentar' })}>{NOME_AUMENTO[PROX[s.pedido.para]]}</button>}
        </>}
        {podeTruco && <button className="btn ouro" onClick={() => agir({ t: 'truco' })}>{NOME_AUMENTO[PROX[s.valor]]}</button>}
        {s.fase === 'fimMao' && <button className="btn p" onClick={() => agir({ t: 'proxima' })}>Próxima mão</button>}
        {s.fase === 'fimJogo' && onNovo && <button className="btn p" onClick={onNovo}>Jogar de novo</button>}
      </div>
      <div className="j-mao" aria-label="Suas cartas">
        {s.maos[seat].map((c, i) => <Carta key={idCarta(c)} c={c} largura="76px" onClick={() => agir({ t: 'jogar', i })} desabilitada={!minhaVez} />)}
      </div>
      <p className="j-dica">Truco paulista: manilhas são a carta depois do vira (♣ zap &gt; ♥ &gt; ♠ &gt; ♦). Ganha a mão quem fizer 2 vazas. Vale 1 ponto, e sobe para 3, 6, 9 e 12. Primeiro a chegar em 12 vence.</p>
    </div>
  );
}
