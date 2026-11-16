'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';

// LGPD: baixar uma cópia dos dados e excluir a conta.
export default function MeusDados() {
  const sb = useRef(null);
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [texto, setTexto] = useState('');
  const [c, setC] = useState(false);
  const cli = () => (sb.current ||= criarCliente());

  async function baixar() {
    setC(true); setMsg(null);
    const { data, error } = await cli().rpc('exportar_meus_dados');
    setC(false);
    if (error) { setMsg({ t: 'erro', m: 'Não foi possível gerar o arquivo agora.' }); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'meus-dados-panthu.json'; a.click(); URL.revokeObjectURL(url);
    setMsg({ t: 'ok', m: 'Arquivo gerado.' });
  }
  async function excluir() {
    setC(true); setMsg(null);
    const { error } = await cli().rpc('excluir_minha_conta');
    if (error) { setC(false); setMsg({ t: 'erro', m: 'Não foi possível excluir agora. Fale com a administração.' }); return; }
    await cli().auth.signOut();
    router.replace('/entrar'); router.refresh();
  }
  return (
    <section className="card" aria-label="Meus dados e privacidade">
      <h3>Meus dados e privacidade</h3>
      <p style={{ color: 'var(--suave)', marginTop: 4 }}>Você decide sobre os seus dados. Leia a <a href="/privacidade">política de privacidade</a> e as <a href="/regras">regras de convivência</a>.</p>
      <div className="j-acoes" style={{ justifyContent: 'flex-start' }}>
        <button className="btn o mini" onClick={baixar} disabled={c}>Baixar meus dados</button>
        {!confirmar && <button className="btn perigo mini" onClick={() => setConfirmar(true)}>Excluir minha conta</button>}
      </div>
      {confirmar && (
        <div className="msg erro" role="alertdialog" aria-label="Confirmar exclusão" style={{ display: 'grid', gap: 8 }}>
          <span>Isto apaga os seus dados pessoais, favoritos, pontos e convites e não pode ser desfeito. Digite <b>EXCLUIR</b> para confirmar.</span>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Digite EXCLUIR" autoComplete="off" />
          <span className="j-acoes" style={{ justifyContent: 'flex-start' }}>
            <button className="btn perigo mini" disabled={c || texto.trim().toUpperCase() !== 'EXCLUIR'} onClick={excluir}>Excluir de vez</button>
            <button className="btn o mini" onClick={() => { setConfirmar(false); setTexto(''); }}>Cancelar</button>
          </span>
        </div>
      )}
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
    </section>
  );
}
