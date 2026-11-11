'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import './chat.css';

// Salvar não é convite: a outra pessoa não é avisada e nada é compartilhado com ela.
export default function AmigoBotao({ id, euId, inicial = false, lista = false }) {
  const [salvo, setSalvo] = useState(inicial);
  const [c, setC] = useState(false);
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  async function salvar() {
    setC(true); setMsg(null);
    const { error } = await criarCliente().from('amigos').insert({ usuario_id: euId, amigo_id: id });
    if (error && error.code !== '23505') setMsg('Não foi possível salvar agora.'); else setSalvo(true);
    setC(false);
  }
  async function remover() {
    setC(true); setMsg(null);
    const { error } = await criarCliente().from('amigos').delete().eq('usuario_id', euId).eq('amigo_id', id);
    if (error) setMsg('Não foi possível remover agora.'); else { setSalvo(false); if (lista) router.refresh(); }
    setC(false);
  }
  if (lista) return <button className="btn o mini" disabled={c} onClick={remover}>Remover</button>;
  return (<div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
    {salvo
      ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className="tag ok">Amigo salvo ✓</span><button className="btn o mini" disabled={c} onClick={remover}>Remover</button></div>
      : <button className="btn p mini" disabled={c} onClick={salvar}>Salvar amigo</button>}
    {msg && <div className="msg erro" role="status">{msg}</div>}
  </div>);
}
