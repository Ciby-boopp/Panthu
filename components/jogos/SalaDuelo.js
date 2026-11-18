'use client';
import { ligarPresenca } from '@/lib/presencaJogo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

const EVENTOS = ['entrou', 'inicio', 'jogada', 'prog', 'fim', 'desistir', 'revanche'];
const novoCodigo = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

// Menu para criar uma sala (e passar o código) ou entrar numa sala com o código do amigo.
export function SalaMenu({ titulo, aoEscolher }) {
  const [entrada, setEntrada] = useState('');
  return (
    <div className="j-mesa">
      <h3>{titulo} online (2 celulares)</h3>
      <p style={{ color: 'var(--suave)', margin: 0 }}>Um jogador cria a sala e passa o código. O outro entra com o código no celular dele. Dica: use “Chamar um amigo” para convidar direto, sem código.</p>
      <div className="j-acoes"><button className="btn p" onClick={() => aoEscolher(novoCodigo(), 0)}>Criar sala</button></div>
      <form className="campo" onSubmit={(e) => { e.preventDefault(); const c = entrada.trim().toUpperCase(); if (c.length >= 4) aoEscolher(c, 1); }}>
        <label htmlFor="cod-sala">Ou entre com um código</label>
        <div className="linha" style={{ flexWrap: 'nowrap' }}>
          <input id="cod-sala" value={entrada} onChange={(e) => setEntrada(e.target.value)} maxLength={6} placeholder="Ex.: K7QZ29" autoCapitalize="characters" autoComplete="off" />
          <button className="btn s" type="submit" disabled={entrada.trim().length < 4}>Entrar</button>
        </div>
      </form>
    </div>
  );
}

// Sala de duelo entre dois celulares. O anfitrião (seat 0) sorteia a configuração (cfg, ex.: a semente do baralho)
// e manda para quem entrou (seat 1). Depois, cada lado envia seus lances/resultados pelo canal.
// children({ cfg, seat, enviar, ouvir }) desenha o jogo.
export default function SalaDuelo({ jogo, titulo, auto, novaCfg, children }) {
  const [sala, setSala] = useState(auto?.sala || null);
  const [seat, setSeat] = useState(auto ? auto.seat : null);
  const [cfg, setCfg] = useState(null);
  const canal = useRef(null), sb = useRef(null), cfgRef = useRef(null), ouvintes = useRef({});
  const enviar = useCallback((evento, payload = {}) => { canal.current?.send({ type: 'broadcast', event: evento, payload }); }, []);
  const ouvir = useCallback((evento, fn) => {
    (ouvintes.current[evento] ||= new Set()).add(fn);
    return () => ouvintes.current[evento]?.delete(fn);
  }, []);

  useEffect(() => {
    if (!sala || seat === null) return;
    sb.current = criarCliente();
    const ch = sb.current.channel(`${jogo}-${sala}`, { config: { broadcast: { self: false } } });
    canal.current = ch;
    const pres = ligarPresenca(sb.current, ch);
    EVENTOS.forEach((ev) => ch.on('broadcast', { event: ev }, ({ payload }) => {
      if (ev === 'entrou' && seat === 0) { if (!cfgRef.current) cfgRef.current = novaCfg(); setCfg(cfgRef.current); ch.send({ type: 'broadcast', event: 'inicio', payload: { cfg: cfgRef.current } }); }
      else if (ev === 'inicio' && seat === 1) { cfgRef.current = payload.cfg; setCfg(payload.cfg); }
      ouvintes.current[ev]?.forEach((fn) => fn(payload));
    }));
    ch.subscribe((st) => { if (st === 'SUBSCRIBED') pres.aoInscrever(); if (st === 'SUBSCRIBED' && seat === 1) ch.send({ type: 'broadcast', event: 'entrou', payload: {} }); });
    return () => { pres.sair(); canal.current = null; };
  }, [sala, seat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (seat !== 1 || cfg || !sala) return;
    const t = setInterval(() => enviar('entrou'), 2000);
    return () => clearInterval(t);
  }, [seat, cfg, sala, enviar]);

  if (!sala) return <SalaMenu titulo={titulo} aoEscolher={(c, l) => { setSala(c); setSeat(l); }} />;
  if (!cfg) {
    return (
      <div className="j-mesa" style={{ textAlign: 'center' }}>
        {seat === 0 ? <><p>Código da sala</p><p className="j-codigo">{sala}</p><p style={{ color: 'var(--suave)' }} role="status">Aguardando o amigo entrar…</p></> : <p role="status">Entrando na sala {sala}…</p>}
      </div>
    );
  }
  return children({ cfg, seat, enviar, ouvir, sala });
}
