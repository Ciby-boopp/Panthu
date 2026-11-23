'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';

// Botão "Criar grupo": qualquer pessoa cria um grupo no bate-papo com o nome que quiser.
export default function CriarGrupo() {
  const router = useRouter();
  const sb = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [env, setEnv] = useState(false);
  const [erro, setErro] = useState(null);

  async function criar(e) {
    e.preventDefault(); setEnv(true); setErro(null);
    const { data, error } = await (sb.current ||= criarCliente()).rpc('grupo_criar', { p_nome: nome, p_descricao: desc });
    setEnv(false);
    if (error) { setErro(error.message && error.message.length < 120 ? error.message : 'Não foi possível criar o grupo agora.'); return; }
    setAberto(false); setNome(''); setDesc('');
    router.push(`/app/chat/tema/${data}`); router.refresh();
  }

  return (<>
    <button type="button" className="btn ouro mini" style={{ margin: '4px 0 8px' }} onClick={() => { setAberto(true); setErro(null); }}>➕ Criar grupo</button>
    {aberto && (
      <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Criar grupo" onClick={(e) => { if (e.target === e.currentTarget) setAberto(false); }}>
        <form className="card modal-caixa" onSubmit={criar}>
          <h2 style={{ marginTop: 0 }}>Criar grupo</h2>
          <div className="campo"><label htmlFor="cg-nome">Nome do grupo</label>
            <input id="cg-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} placeholder="Ex.: Corrida de rua" required autoFocus /></div>
          <div className="campo"><label htmlFor="cg-desc">Sobre o que vão conversar? (opcional)</label>
            <input id="cg-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={160} placeholder="Ex.: Dicas de treino e provas" /></div>
          <p style={{ color: 'var(--suave)', fontSize: 13 }}>Qualquer pessoa do Panthu poderá encontrar e entrar no grupo. Use um nome respeitoso.</p>
          {erro && <div className="msg erro" role="status">{erro}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn p" disabled={env || nome.trim().length < 3}>{env ? 'Criando…' : 'Criar grupo'}</button>
            <button type="button" className="btn" onClick={() => setAberto(false)}>Cancelar</button>
          </div>
        </form>
      </div>
    )}
  </>);
}
