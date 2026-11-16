'use client';
import { useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

// Host/admin: confere o código do cupom de brinde e dá baixa na entrega.
export default function ValidarCupom() {
  const sb = useRef(null);
  const [codigo, setCodigo] = useState('');
  const [r, setR] = useState(null);
  const [c, setC] = useState(false);
  async function chamar(usar) {
    setC(true);
    const { data, error } = await (sb.current ||= criarCliente()).rpc('validar_cupom_pontos', { p_codigo: codigo, p_usar: usar });
    setC(false);
    setR(error ? { valido: false, mensagem: 'Não foi possível conferir agora.' } : data?.[0]);
  }
  return (
    <section className="card" aria-label="Conferir cupom">
      <h3>Conferir cupom de brinde</h3>
      <div className="campo"><label htmlFor="cupom">Código do cupom</label>
        <input id="cupom" value={codigo} onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setR(null); }} placeholder="PTH-XXXXXXXX" autoCapitalize="characters" autoComplete="off" /></div>
      <div className="j-acoes" style={{ justifyContent: 'flex-start' }}>
        <button className="btn s" disabled={c || codigo.trim().length < 6} onClick={() => chamar(false)}>Conferir</button>
        {r?.valido && r.status === 'disponivel' && <button className="btn p" disabled={c} onClick={() => chamar(true)}>Entregar brinde (dar baixa)</button>}
      </div>
      {r && <div className={`msg ${r.valido ? 'ok' : 'erro'}`} role="status">{r.mensagem}{r.pessoa ? ` ${r.pessoa} — ${r.brinde}.` : ''}</div>}
    </section>
  );
}
