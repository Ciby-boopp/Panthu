'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

export default function Entrar() {
  const [modo, setModo] = useState('login');
  const [msg, setMsg] = useState(null);
  const [carregando, setC] = useState(false);
  const router = useRouter();

  async function enviar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target);
    const email = String(f.get('email')).trim();
    const senha = String(f.get('senha') || '');
    const sb = criarCliente();
    if (modo === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg({ t: 'erro', m: 'E-mail ou senha incorretos.' });
      else { router.replace('/app'); router.refresh(); return; }
    } else if (modo === 'cadastro') {
      const { data, error } = await sb.auth.signUp({
        email, password: senha,
        options: { data: { nome: String(f.get('nome')).trim(), telefone: String(f.get('telefone')).trim() } }
      });
      if (error) setMsg({ t: 'erro', m: 'Não foi possível criar a conta. Confira os dados ou tente entrar.' });
      else if (data.session) { router.replace('/app'); router.refresh(); return; }
      else setMsg({ t: 'ok', m: 'Conta criada! Confirme seu e-mail para entrar.' });
    } else {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/redefinir` });
      setMsg(error ? { t: 'erro', m: 'Não foi possível enviar o e-mail agora.' } : { t: 'ok', m: 'Se o e-mail existir, enviamos o link para criar uma nova senha.' });
    }
    setC(false);
  }

  return (
    <div className="centro">
      <div className="card">
        <div className="marca" style={{ marginBottom: 8 }}><Logo />panthu</div>
        <h1 style={{ fontSize: 28 }}>{modo === 'login' ? 'Bora sentar junto?' : modo === 'cadastro' ? 'Criar minha conta' : 'Recuperar senha'}</h1>
        <form onSubmit={enviar}>
          {modo === 'cadastro' && (<>
            <div className="campo"><label htmlFor="nome">Nome completo</label><input id="nome" name="nome" required minLength={3} autoComplete="name" /></div>
            <div className="campo"><label htmlFor="tel">Telefone</label><input id="tel" name="telefone" type="tel" required autoComplete="tel" /></div>
          </>)}
          <div className="campo"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          {modo !== 'recuperar' && <div className="campo"><label htmlFor="senha">Senha</label><input id="senha" name="senha" type="password" required minLength={8} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} /></div>}
          {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
          <button className="btn p" style={{ width: '100%' }} disabled={carregando}>
            {carregando ? 'Aguarde…' : modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Criar conta' : 'Enviar link'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 14 }}>
          {modo !== 'login' && <a href="#" onClick={(e) => { e.preventDefault(); setModo('login'); setMsg(null); }}>Já tenho conta</a>}
          {modo === 'login' && (<><a href="#" onClick={(e) => { e.preventDefault(); setModo('cadastro'); setMsg(null); }}>Criar conta</a> · <a href="#" onClick={(e) => { e.preventDefault(); setModo('recuperar'); setMsg(null); }}>Esqueci a senha</a></>)}
        </p>
      </div>
    </div>
  );
}
