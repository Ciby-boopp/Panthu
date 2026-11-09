'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function PerfilForm({ perfil }) {
  const [msg, setMsg] = useState(null);
  const [c, setC] = useState(false);
  const router = useRouter();
  async function salvar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target);
    const { error } = await criarCliente().from('perfis')
      .update({ nome: String(f.get('nome')).trim(), telefone: String(f.get('telefone')).trim() }).eq('id', perfil.id);
    setC(false);
    if (error) setMsg({ t: 'erro', m: 'Não foi possível salvar.' });
    else { setMsg({ t: 'ok', m: 'Dados atualizados!' }); router.refresh(); }
  }
  return (
    <form onSubmit={salvar} className="card">
      <div className="campo"><label htmlFor="nome">Nome completo</label><input id="nome" name="nome" required minLength={3} defaultValue={perfil.nome} /></div>
      <div className="campo"><label htmlFor="tel">Telefone</label><input id="tel" name="telefone" type="tel" required defaultValue={perfil.telefone || ''} /></div>
      <div className="campo"><label>E-mail</label><input value={perfil.email || ''} readOnly disabled /></div>
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
      <button className="btn p" disabled={c}>{c ? 'Salvando…' : 'Salvar'}</button>
    </form>
  );
}
