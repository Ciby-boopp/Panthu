'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function NovaRegiao() {
  const sb = useRef(null); const router = useRouter();
  const [nome, setNome] = useState(''); const [msg, setMsg] = useState(null);
  async function criar(e) {
    e.preventDefault(); setMsg(null);
    const { error } = await (sb.current ||= criarCliente()).from('regioes').insert({ nome: nome.trim() });
    if (error) setMsg('Não foi possível criar a região.'); else { setNome(''); router.refresh(); }
  }
  return (
    <form className="card" onSubmit={criar}>
      <div className="campo"><label htmlFor="rg">Nova cidade ou região</label><input id="rg" value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={80} required /></div>
      {msg && <p className="msg erro">{msg}</p>}
      <button className="btn p mini">Adicionar</button>
    </form>
  );
}
