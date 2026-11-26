'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';

export default function DecidirHost({ id }) {
  const router = useRouter(); const sb = useRef(null);
  const [resp, setResp] = useState('');
  const [msg, setMsg] = useState(null);
  const [env, setEnv] = useState(false);
  async function decidir(aprovar) {
    if (!window.confirm(aprovar ? 'Aprovar e tornar esta pessoa host?' : 'Recusar este pedido?')) return;
    setEnv(true); setMsg(null);
    const { error } = await (sb.current ||= criarCliente()).rpc('host_decidir', { p_id: id, p_aprovar: aprovar, p_resposta: resp });
    setEnv(false);
    if (error) return setMsg({ t: 'erro', m: 'Não foi possível salvar agora.' });
    router.refresh();
  }
  return (<>
    <div className="campo"><label htmlFor={`r-${id}`}>Recado para a pessoa (opcional)</label>
      <input id={`r-${id}`} value={resp} maxLength={400} onChange={(e) => setResp(e.target.value)} placeholder="Ex.: Bem-vinda! Vamos definir seus eventos." /></div>
    {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className="btn p mini" disabled={env} onClick={() => decidir(true)}>✅ Aprovar e tornar host</button>
      <button type="button" className="btn perigo mini" disabled={env} onClick={() => decidir(false)}>Recusar</button>
    </div>
  </>);
}
