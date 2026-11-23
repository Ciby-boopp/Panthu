'use client';
import { useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';
import SenhaInput from './SenhaInput';
import { senhaForte, SENHA_REGRA } from '@/lib/senha';

// Alterar a senha estando logada: confere a senha atual e salva a nova.
export default function AlterarSenha() {
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    const form = e.target, f = new FormData(form);
    const atual = f.get('atual'), nova = f.get('senha'), conf = f.get('conf');
    if (!senhaForte(nova)) return setMsg({ t: 'erro', m: SENHA_REGRA });
    if (nova !== conf) return setMsg({ t: 'erro', m: 'A confirmação não é igual à nova senha.' });
    if (nova === atual) return setMsg({ t: 'erro', m: 'A nova senha precisa ser diferente da atual.' });
    setSalvando(true); setMsg(null);
    const sb = criarCliente();
    const { data: { user } } = await sb.auth.getUser();
    const { error: e1 } = await sb.auth.signInWithPassword({ email: user?.email || '', password: atual });
    if (e1) { setSalvando(false); return setMsg({ t: 'erro', m: /rate|many/i.test(e1.message || '') ? 'Muitas tentativas. Aguarde alguns minutos.' : 'A senha atual está incorreta.' }); }
    const { error } = await sb.auth.updateUser({ password: nova });
    setSalvando(false);
    if (error) return setMsg({ t: 'erro', m: /same|different/i.test(error.message || '') ? 'A nova senha precisa ser diferente da atual.' : 'Não foi possível alterar a senha agora.' });
    form.reset();
    setMsg({ t: 'ok', m: 'Senha alterada com sucesso!' });
  }

  return (
    <section className="card" aria-labelledby="c-senha">
      <h2 id="c-senha" style={{ marginTop: 0 }}>🔑 Alterar senha</h2>
      <form onSubmit={salvar}>
        <div className="campo"><label htmlFor="sa">Senha atual</label><SenhaInput id="sa" name="atual" autoComplete="current-password" minLength={1} /></div>
        <div className="campo"><label htmlFor="sn">Nova senha</label><SenhaInput id="sn" forte autoComplete="new-password" /></div>
        <div className="campo"><label htmlFor="sc">Repita a nova senha</label><SenhaInput id="sc" name="conf" autoComplete="new-password" /></div>
        {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
        <button className="btn p" disabled={salvando}>{salvando ? 'Salvando…' : 'Alterar senha'}</button>
      </form>
    </section>
  );
}
