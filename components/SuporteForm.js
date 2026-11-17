'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function SuporteForm() {
  const sb = useRef(null); const router = useRouter();
  const [msg, setMsg] = useState(null); const [c, setC] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target);
    const { error } = await (sb.current ||= criarCliente()).from('suporte_tickets').insert({ assunto: String(f.get('assunto')).trim(), mensagem: String(f.get('mensagem')).trim() });
    setC(false);
    if (error) setMsg({ t: 'erro', m: 'Não foi possível enviar agora.' }); else { e.target.reset(); setMsg({ t: 'ok', m: 'Recebemos o seu chamado. Responderemos por aqui.' }); router.refresh(); }
  }
  return (
    <form className="card" onSubmit={enviar}>
      <div className="campo"><label htmlFor="sa">Assunto</label><input id="sa" name="assunto" required minLength={3} maxLength={120} /></div>
      <div className="campo"><label htmlFor="sm">Conte o que aconteceu</label><textarea id="sm" name="mensagem" required minLength={5} maxLength={2000} /></div>
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
      <button className="btn p" disabled={c}>{c ? 'Enviando…' : 'Enviar'}</button>
    </form>
  );
}
