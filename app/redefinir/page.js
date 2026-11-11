'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import SenhaInput from '@/components/SenhaInput';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
export default function Redefinir() {
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  async function salvar(e) {
    e.preventDefault();
    const senha = new FormData(e.target).get('senha');
    const { error } = await criarCliente().auth.updateUser({ password: senha });
    if (error) setMsg('Link expirado ou inválido. Peça um novo em "Esqueci a senha".');
    else { router.replace('/app'); router.refresh(); }
  }
  return (
    <div className="centro"><div className="tema-canto"><ThemeToggle /></div><div className="card">
      <Logo completo />
      <h1 style={{ fontSize: 28 }}>Nova senha</h1>
      <form onSubmit={salvar}>
        <div className="campo"><label htmlFor="s">Nova senha (mín. 8 caracteres)</label><SenhaInput id="s" autoComplete="new-password" /></div>
        {msg && <div className="msg erro">{msg}</div>}
        <button className="btn p" style={{ width: '100%' }}>Salvar senha</button>
      </form>
    </div></div>
  );
}
