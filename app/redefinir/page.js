'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import SenhaInput from '@/components/SenhaInput';
import Logo from '@/components/Logo';
import { senhaForte, SENHA_REGRA } from '@/lib/senha';
export default function Redefinir() {
  const [msg, setMsg] = useState(null);
  const [pronto, setPronto] = useState(null); // null = verificando, true = há sessão de recuperação, false = link inválido
  const [salvando, setSalvando] = useState(false);
  const router = useRouter();
  // O link do e-mail passa por /auth/callback, que cria a sessão. Aqui só conferimos se ela existe
  // (e aceitamos também o formato antigo, com o token no endereço).
  useEffect(() => {
    const sb = criarCliente();
    let vivo = true;
    const { data: { subscription } } = sb.auth.onAuthStateChange((ev, s) => { if (vivo && s && (ev === 'PASSWORD_RECOVERY' || ev === 'SIGNED_IN')) setPronto(true); });
    sb.auth.getSession().then(({ data }) => { if (vivo && data.session) setPronto(true); });
    const t = setTimeout(() => { if (vivo) setPronto((p) => (p === null ? false : p)); }, 2500);
    return () => { vivo = false; clearTimeout(t); subscription.unsubscribe(); };
  }, []);
  async function salvar(e) {
    e.preventDefault();
    const senha = new FormData(e.target).get('senha');
    if (!senhaForte(senha)) return setMsg(SENHA_REGRA);
    setSalvando(true); setMsg(null);
    const { error } = await criarCliente().auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) setMsg(/same|different/i.test(error.message || '') ? 'A nova senha precisa ser diferente da atual.' : 'Não foi possível salvar. O link pode ter vencido: peça um novo em “Esqueci a senha”.');
    else { router.replace('/app'); router.refresh(); }
  }
  return (
    <div className="centro"><div className="card">
      <Logo completo />
      <h1 style={{ fontSize: 28 }}>Nova senha</h1>
      {pronto === null && <p style={{ textAlign: 'center' }}>Verificando seu link…</p>}
      {pronto === false && (<>
        <div className="msg erro">Este link venceu, já foi usado ou foi aberto em outro aparelho. Peça um novo link e abra o e-mail mais recente.</div>
        <a className="btn ouro" style={{ width: '100%', textAlign: 'center' }} href="/entrar?erro=link_senha">Pedir novo link</a>
      </>)}
      {pronto && (
        <form onSubmit={salvar}>
          <div className="campo"><label htmlFor="s">Nova senha</label><SenhaInput id="s" forte autoComplete="new-password" /></div>
          {msg && <div className="msg erro">{msg}</div>}
          <button className="btn ouro" style={{ width: '100%' }} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar senha'}</button>
        </form>
      )}
    </div></div>
  );
}
