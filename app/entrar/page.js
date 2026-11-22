'use client';
import { useEffect, useState } from 'react';
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
  else if (c === 'weak_password' || m.includes('password')) t = `A senha foi recusada pelo servidor. ${SENHA_REGRA}`;
  else if (c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit' || error.status === 429) t = 'Muitas tentativas em pouco tempo. Aguarde cerca de uma hora e tente de novo.';
  else if (c === 'email_address_invalid' || (m.includes('invalid') && m.includes('email'))) t = 'O Supabase recusou este e-mail. Confira se está escrito corretamente.';
  else if (c === 'signup_disabled') t = 'Os cadastros estão desativados no momento.';
  else if (m.includes('database error')) t = 'O servidor não conseguiu salvar o perfil. Avise o administrador do Panthu.';
  return `${t} (detalhe: ${c || error.status || error.message})`;
}

// Explica o motivo real quando o Supabase recusa o envio (limite de e-mails, servidor de e-mail não configurado...).
function motivoRecuperar(error) {
  const t = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (error?.status === 429 || t.includes('rate') || t.includes('seconds')) return 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.';
  if (t.includes('not authorized')) return 'O envio de e-mails ainda não foi liberado para este endereço. Avise o suporte do Panthu.';
  if (t.includes('smtp') || t.includes('sending') || error?.status >= 500) return 'O serviço de e-mail está com problema. Tente de novo em alguns minutos ou fale com o suporte.';
  return 'Não foi possível enviar o e-mail agora. Confira o endereço e tente de novo.';
}

export default function Entrar() {
  const [modo, setModo] = useState('login');
  const [msg, setMsg] = useState(null);
  const [carregando, setC] = useState(false);
  const router = useRouter();
  const [reenviar, setReenviar] = useState('');
  // Avisos vindos de redirecionamentos (link inválido, sessão expirada, acesso negado).
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      const avisos = {
        link: ['erro', 'Este link de confirmação não funcionou (venceu, já foi usado ou foi aberto em outro aparelho). Tente entrar com seu e-mail e senha; se pedir confirmação, reenvie o e-mail.'],
        link_senha: ['erro', 'Este link de nova senha venceu ou já foi usado. Peça um novo em “Esqueci a senha” e abra o link mais recente.'],
        acesso: ['erro', 'Sua conta está sem acesso no momento. Fale com o administrador.'],
      };
      if (q.get('sessao') === 'expirada') setMsg({ t: 'erro', m: 'Sua sessão expirou. Entre novamente para continuar.' });
      else if (avisos[q.get('erro')]) { const [t, m] = avisos[q.get('erro')]; setMsg({ t, m }); if (q.get('erro') === 'link_senha') setModo('recuperar'); }
    } catch {}
  }, []);
  // Link de indicação (?ref=CODIGO): guarda o código para usar depois do cadastro.
  useEffect(() => {
    try {
      const r = new URLSearchParams(location.search).get('ref');
      if (r) { localStorage.setItem('panthu_ref', r.trim().toUpperCase().slice(0, 12)); setModo('cadastro'); }
    } catch {}
  }, []);

  async function reenviarConfirmacao() {
    if (!reenviar) return;
    const { error } = await criarCliente().auth.resend({ type: 'signup', email: reenviar, options: { emailRedirectTo: `${location.origin}/auth/callback?next=/app` } });
    setMsg(error ? { t: 'erro', m: 'Não foi possível reenviar agora. Aguarde um minuto e tente de novo.' } : { t: 'ok', m: 'Reenviamos o e-mail de confirmação. Veja também a caixa de spam.' });
  }

  async function enviar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target);
    const email = String(f.get('email')).trim();
    const senha = String(f.get('senha') || '');
    const sb = criarCliente();
    if (modo === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) {
        if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message || '')) { setReenviar(email); setMsg({ t: 'erro', m: 'Seu e-mail ainda não foi confirmado. Abra o e-mail que enviamos e toque no link, ou peça o reenvio abaixo.' }); }
        else if (error.status === 429) setMsg({ t: 'erro', m: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
        else if (!navigator.onLine || /fetch|network/i.test(error.message || '')) setMsg({ t: 'erro', m: 'Sem conexão com a internet. Verifique e tente de novo.' });
        else { setReenviar(''); setMsg({ t: 'erro', m: 'E-mail ou senha incorretos.' }); }
      } else { router.replace('/app'); router.refresh(); return; }
    } else if (modo === 'cadastro') {
      if (!senhaForte(senha)) { setMsg({ t: 'erro', m: SENHA_REGRA }); setC(false); return; }
      const { data, error } = await sb.auth.signUp({
        email, password: senha,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/app`, data: { nome: String(f.get('nome')).trim(), telefone: String(f.get('telefone')).trim() } }
      });
      if (error) setMsg({ t: 'erro', m: motivoCadastro(error) });
      else if (data.session) { router.replace('/app'); router.refresh(); return; }
      else setMsg({ t: 'ok', m: 'Conta criada! Enviamos um e-mail de confirmação: abra e toque no link para entrar. Veja também o spam.' });
    } else {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/redefinir` });
      setMsg(error ? { t: 'erro', m: motivoRecuperar(error) } : { t: 'ok', m: 'Se o e-mail existir, enviamos o link para criar uma nova senha.' });
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
          {reenviar && <button type="button" className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={reenviarConfirmacao}>Reenviar e-mail de confirmação</button>}
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
