'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function ResponderTicket({ t }) {
  const sb = useRef(null); const router = useRouter();
  const [resp, setResp] = useState(t.resposta || ''); const [c, setC] = useState(false); const [erro, setErro] = useState('');
  async function salvar(status) {
    setC(true); setErro('');
    const dados = { status, resposta: resp.trim() || null, respondido_em: resp.trim() ? new Date().toISOString() : null };
    const { error } = await (sb.current ||= criarCliente()).from('suporte_tickets').update(dados).eq('id', t.id);
    setC(false); if (error) setErro('Não foi possível salvar.'); else router.refresh();
  }
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
      <textarea value={resp} onChange={(e) => setResp(e.target.value)} placeholder="Resposta para a pessoa" maxLength={2000} aria-label="Resposta" style={{ minHeight: 70 }} />
      {erro && <p className="msg erro">{erro}</p>}
      <span className="j-acoes" style={{ justifyContent: 'flex-start' }}>
        <button className="btn s mini" disabled={c} onClick={() => salvar('em_andamento')}>Em andamento</button>
        <button className="btn p mini" disabled={c} onClick={() => salvar('resolvido')}>Responder e resolver</button>
      </span>
    </div>
  );
}
