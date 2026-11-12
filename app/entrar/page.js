'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import SenhaInput from '@/components/SenhaInput';
import { senhaForte, SENHA_REGRA } from '@/lib/senha';

// Traduz o erro real do Supabase para uma mensagem que diz o que ajustar (o código técnico vai junto, para facilitar o suporte).
function motivoCadastro(error) {
  const c = error.code || '', m = (error.message || '').toLowerCase();
  let t = 'Não foi possível criar a conta agora.';
  if (c === 'user_already_exists' || m.includes('already registered')) t = 'Este e-mail já tem cadastro. Toque em “Já tenho conta” para entrar, ou use “Esqueci a senha”.';
  else if (c === 'weak_password' || m.includes('password')) t = 'A senha foi recusada. Use pelo menos 8 caracteres, misturando letras e números.';
  else if (c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit' || error.status === 429) t = 'Muitas tentativas em pouco tempo. Aguarde cerca de uma hora e tente de novo.';
  else if (c === 'email_address_invalid' || (m.includes('invalid') && m.includes('email'))) t = 'O Supabase recusou este e-mail. Confira se está escrito corretamente.';
  else if (c === 'signup_disabled') t = 'Os cadastros estão desativados no momento.';
  else if (m.includes('database error')) t = 'O servidor não conseguiu salvar o perfil. Avise o administrador do Panthu.';
  return `${t} (detalhe: ${c || error.status || error.message})`;
}

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
      if (!senhaForte(senha)) { setMsg({ t: 'erro', m: SENHA_REGRA }); setC(false); return; }
      const { data, error } = await sb.auth.signUp({
        email, password: senha,
        options: { data: { nome: String(f.get('nome')).trim(), telefone: String(f.get('telefone')).trim() } }
      });
      if (error) setMsg({ t: 'erro', m: motivoCadastro(error) });
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
        <Logo completo />
        {modo !== 'login' && <h1 style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{modo === 'cadastro' ? 'Criar minha conta' : 'Recuperar senha'}</h1>}
        <form onSubmit={enviar}>
          {modo === 'cadastro' && (<>
            <div className="campo"><label htmlFor="nome">Nome completo</label><input id="nome" name="nome" required minLength={3} autoComplete="name" /></div>
            <div className="campo"><label htmlFor="tel">Telefone</label><input id="tel" name="telefone" type="tel" required autoComplete="tel" /></div>
          </>)}
          <div className="campo"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          {modo !== 'recuperar' && <div className="campo"><label htmlFor="senha">Senha</label><SenhaInput id="senha" forte={modo === 'cadastro'} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} /></div>}
          {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
          <button className="btn ouro" style={{ width: '100%' }} disabled={carregando}>
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
