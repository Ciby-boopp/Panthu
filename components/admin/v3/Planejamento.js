'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
const ROT = { aberta: 'Aberta', andamento: 'Em andamento', feita: 'Feita' };
export default function Planejamento({ tipo, itens }) {
  const sb = useRef(null); const router = useRouter();
  const cli = () => (sb.current ||= criarCliente());
  const [msg, setMsg] = useState(null);
  async function criar(e) {
    e.preventDefault(); setMsg(null);
    const f = new FormData(e.target);
    const { error } = await cli().from('adm_tarefas').insert({ tipo, titulo: String(f.get('titulo')).trim(), descricao: String(f.get('descricao') || '').trim() || null, prazo: f.get('prazo') || null });
    if (error) setMsg('Não foi possível salvar.'); else { e.target.reset(); router.refresh(); }
  }
  const mudar = async (id, status) => { await cli().from('adm_tarefas').update({ status }).eq('id', id); router.refresh(); };
  const apagar = async (id) => { if (confirm('Excluir este item?')) { await cli().from('adm_tarefas').delete().eq('id', id); router.refresh(); } };
  return (<>
    <form className="card" onSubmit={criar}>
      <div className="campo"><label htmlFor="pt">{tipo === 'meta' ? 'Nova meta' : tipo === 'agenda' ? 'Novo compromisso' : 'Nova tarefa'}</label><input id="pt" name="titulo" required minLength={3} maxLength={140} /></div>
      <div className="dois"><div className="campo"><label htmlFor="pd">Detalhes</label><input id="pd" name="descricao" maxLength={300} /></div><div className="campo"><label htmlFor="pp">{tipo === 'agenda' ? 'Data' : 'Prazo'}</label><input id="pp" name="prazo" type="date" required={tipo === 'agenda'} /></div></div>
      {msg && <p className="msg erro">{msg}</p>}<button className="btn p mini">Adicionar</button>
    </form>
    <section className="card">
      {itens.length === 0 ? <p className="vazio">Nada por aqui ainda.</p> : itens.map((t) => (
        <div className="item" key={t.id} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 200px', textDecoration: t.status === 'feita' ? 'line-through' : 'none' }}><b>{t.titulo}</b><small>{t.descricao}{t.prazo ? ` · ${new Date(t.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</small></span>
          <span>{tipo !== 'agenda' && <select value={t.status} onChange={(e) => mudar(t.id, e.target.value)} aria-label="Situação" style={{ width: 'auto', minHeight: 36, padding: '4px 8px' }}>{Object.entries(ROT).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>}
            <button className="btn o mini" onClick={() => apagar(t.id)} aria-label={`Excluir ${t.titulo}`}>Excluir</button></span>
        </div>
      ))}
    </section>
  </>);
}
