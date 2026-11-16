'use client';
import { useEffect, useRef, useState } from 'react';
import Carta from './Carta';
import { criarCliente } from '@/lib/supabase/client';
import { combina, novaMemoria, resolver, virar, visao } from '@/lib/memoria';

// seat 0 = quem chamou (anfitrião, guarda o estado); seat 1 = quem aceitou.
export default function MemoriaOnline({ sala, seat, aoTerminar }) {
  const [s, setS] = useState(null);
  const sRef = useRef(null), canal = useRef(null), sb = useRef(null), timer = useRef(null), enviado = useRef(false);

  const publicar = () => {
    setS(visao(sRef.current));
    canal.current?.send({ type: 'broadcast', event: 'estado', payload: visao(sRef.current) });
  };
  const jogar = (lugar, i) => {
    const novo = virar(sRef.current, i, lugar);
    if (novo === sRef.current) return;
    sRef.current = novo; publicar();
    if (novo.viradas.length === 2) {
      timer.current = setTimeout(() => { sRef.current = resolver(sRef.current); publicar(); }, combina(novo) ? 600 : 1100);
    }
  };

  useEffect(() => {
    sb.current = criarCliente();
    const ch = sb.current.channel(`memoria-${sala}`, { config: { broadcast: { self: false } } });
    canal.current = ch;
    if (seat === 0) {
      ch.on('broadcast', { event: 'entrou' }, () => { if (!sRef.current) sRef.current = novaMemoria(8); publicar(); })
        .on('broadcast', { event: 'acao' }, ({ payload }) => jogar(1, payload.i));
    } else {
      ch.on('broadcast', { event: 'estado' }, ({ payload }) => setS(payload));
    }
    ch.subscribe((st) => { if (st === 'SUBSCRIBED' && seat === 1) ch.send({ type: 'broadcast', event: 'entrou', payload: {} }); });
    return () => { clearTimeout(timer.current); sb.current.removeChannel(ch); };
  }, [sala, seat]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quem entra repete o aviso até receber o tabuleiro.
  useEffect(() => {
    if (seat !== 1 || s) return;
    const t = setInterval(() => canal.current?.send({ type: 'broadcast', event: 'entrou', payload: {} }), 2000);
    return () => clearInterval(t);
  }, [seat, s]);

  useEffect(() => {
    if (!s || s.fase !== 'fim' || enviado.current) return;
    enviado.current = true;
    const eu = s.pares[seat], ele = s.pares[1 - seat];
    aoTerminar?.({ pontos: eu * 100, vitoria: eu === ele ? null : eu > ele, detalhes: { online: true, pares: s.pares, jogadas: s.jogadas } });
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const clicar = (i) => {
    if (!s || s.fase !== 'jogando' || s.vez !== seat || s.viradas.length >= 2) return;
    if (seat === 0) jogar(0, i); else canal.current?.send({ type: 'broadcast', event: 'acao', payload: { i } });
  };

  if (!s) {
    return (
      <div className="j-mesa" style={{ textAlign: 'center' }}>
        {seat === 0 ? <><p>Código da sala</p><p className="j-codigo">{sala}</p><p style={{ color: 'var(--suave)' }} role="status">Aguardando o amigo entrar…</p></> : <p role="status">Entrando na sala {sala}…</p>}
      </div>
    );
  }
  const op = 1 - seat;
  const cols = 4;
  const minhaVez = s.vez === seat && s.fase === 'jogando';
  const placar = s.pares[seat] === s.pares[op] ? `Empate: ${s.pares[seat]} a ${s.pares[op]}.` : s.pares[seat] > s.pares[op] ? `🏆 Você venceu: ${s.pares[seat]} a ${s.pares[op]}!` : `O amigo venceu: ${s.pares[op]} a ${s.pares[seat]}.`;
  return (
    <div className="j-mesa">
      <div className="linha">
        <span>{s.fase === 'jogando' && <span className="tag ok" role="status">{minhaVez ? 'Sua vez' : 'Vez do amigo…'}</span>}</span>
        <span><span className="tag ok">Você: {s.pares[seat]}</span><span className="tag">Amigo: {s.pares[op]}</span></span>
      </div>
      <div className="j-memoria" style={{ '--cols': cols }}>
        {s.cartas.map((c, i) => <Carta key={c.id} c={c.f} baixo={!c.f} largura="100%" sel={c.achada} onClick={() => clicar(i)} desabilitada={c.achada || !minhaVez} />)}
      </div>
      {s.fase === 'fim' && <p role="status" className="j-final">{placar}</p>}
      <p className="j-dica">Se o amigo fechar o app durante a partida, ela termina.</p>
    </div>
  );
}
