'use client';
import { useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';
import './chat.css';

const ASPECTOS = [['organizacao', 'Organização do evento'], ['estrutura', 'Localização e estrutura'], ['interacao', 'Interação entre participantes']];
function Estrelas({ valor, aoMudar, rotulo }) {
  return (<div className="estrelas" role="radiogroup" aria-label={rotulo}>
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5`} className={n <= (valor || 0) ? 'on' : ''} onClick={() => aoMudar(valor === n && rotulo !== 'Experiência geral' ? null : n)}>★</button>))}
  </div>);
}

export default function AvaliarEvento({ eventoId, usuarioId, inicial }) {
  const [a, setA] = useState(inicial || { nota_geral: 0, organizacao: null, estrutura: null, interacao: null, comentario: '' });
  const [enviada, setEnviada] = useState(!!inicial);
  const [editando, setEditando] = useState(!inicial);
  const [c, setC] = useState(false);
  const [msg, setMsg] = useState(null);
  async function enviar(e) {
    e.preventDefault(); setMsg(null);
    if (!a.nota_geral) return setMsg({ t: 'erro', m: 'Escolha de 1 a 5 estrelas para a experiência geral.' });
    setC(true);
    const { error } = await criarCliente().from('avaliacoes').upsert({
      evento_id: eventoId, usuario_id: usuarioId, nota_geral: a.nota_geral, organizacao: a.organizacao, estrutura: a.estrutura,
      interacao: a.interacao, comentario: (a.comentario || '').trim() || null, atualizado_em: new Date().toISOString()
    }, { onConflict: 'evento_id,usuario_id' });
    setC(false);
    if (error) return setMsg({ t: 'erro', m: 'Não foi possível enviar sua avaliação. Tente de novo em instantes.' });
    setEnviada(true); setEditando(false);
    setMsg({ t: 'ok', m: 'Obrigado! Sua avaliação nos ajuda a melhorar o Panthu.' });
  }
  return (
    <div className="card">
      <h3>Como foi o encontro?</h3>
      {!editando && (<>
        <p style={{ color: 'var(--suave)' }}>Sua avaliação: <b className="estrela-fixa">{'★'.repeat(a.nota_geral)}</b>{' '}({a.nota_geral} de 5)</p>
        <button className="btn s mini" onClick={() => { setEditando(true); setMsg(null); }}>Editar avaliação</button>
      </>)}
      {editando && (
        <form onSubmit={enviar}>
          <div className="campo"><label>Experiência geral</label><Estrelas rotulo="Experiência geral" valor={a.nota_geral} aoMudar={v => setA({ ...a, nota_geral: v })} /></div>
          {ASPECTOS.map(([k, nome]) => (<div className="campo" key={k}><label>{nome} <small style={{ color: 'var(--suave)' }}>(opcional)</small></label>
            <Estrelas rotulo={nome} valor={a[k]} aoMudar={v => setA({ ...a, [k]: v })} /></div>))}
          <div className="campo"><label htmlFor="coment">Comentários e sugestões (opcional)</label>
            <textarea id="coment" maxLength={1000} value={a.comentario || ''} onChange={e => setA({ ...a, comentario: e.target.value })} placeholder="O que foi bom? O que podemos melhorar?" /></div>
          <button className="btn p" disabled={c}>{c ? 'Enviando…' : enviada ? 'Salvar alterações' : 'Enviar avaliação'}</button>
          {enviada && <button type="button" className="btn o" style={{ marginLeft: 8 }} onClick={() => setEditando(false)}>Cancelar</button>}
        </form>)}
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
    </div>
  );
}
