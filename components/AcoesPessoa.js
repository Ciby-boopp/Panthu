'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import './chat.css';

export default function AcoesPessoa({ id }) {
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  const sb = criarCliente();

  async function conversar() {
    const { data, error } = await sb.rpc('iniciar_conversa', { outro: id });
    if (error) return setMsg({ t: 'erro', m: 'Só é possível conversar com quem participa do mesmo evento que você.' });
    router.push(`/app/chat/${data}`);
  }
  async function denunciar(e) {
    e.preventDefault();
    const motivo = String(new FormData(e.target).get('motivo'));
    const { error } = await sb.rpc('denunciar_usuario', { p_usuario: id, p_motivo: motivo });
    setAberto(false);
    setMsg(error ? { t: 'erro', m: 'Não foi possível enviar. Descreva o motivo com pelo menos 5 caracteres.' } : { t: 'ok', m: 'Denúncia enviada. A equipe vai analisar.' });
  }
  return (<>
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn s mini" onClick={conversar}>Conversar</button>
      <button className="btn o mini" onClick={() => setAberto(!aberto)}>Denunciar</button>
    </div>
    {msg && <div className={`msg ${msg.t}`} role="status" style={{ flexBasis: '100%' }}>{msg.m}</div>}
    {aberto && (
      <form onSubmit={denunciar} style={{ flexBasis: '100%' }}>
        <textarea name="motivo" required minLength={5} maxLength={500} placeholder="Descreva o comportamento inadequado" />
        <button className="btn p mini" style={{ marginTop: 6 }}>Enviar denúncia</button>
      </form>
    )}
  </>);
}
