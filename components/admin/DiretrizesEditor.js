'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';

// Editor das diretrizes: cada seção tem título, texto e "mostrar para todos". Seções padrão não podem ser excluídas.
export default function DiretrizesEditor({ inicial }) {
  const sb = useRef(null); const router = useRouter();
  const get = () => (sb.current ||= criarCliente());
  const [lista, setLista] = useState(inicial);
  const [msg, setMsg] = useState({});
  const [novo, setNovo] = useState('');
  const aviso = (id, t, m) => setMsg((x) => ({ ...x, [id]: { t, m } }));
  const mudar = (id, campo, v) => setLista((l) => l.map((s) => (s.id === id ? { ...s, [campo]: v, sujo: true } : s)));

  async function salvar(s) {
    if (s.titulo.trim().length < 2) return aviso(s.id, 'erro', 'Escreva um título.');
    const { error } = await get().from('diretrizes_comunidade').update({ titulo: s.titulo.trim(), conteudo: s.conteudo, visivel: s.visivel }).eq('id', s.id);
    if (error) return aviso(s.id, 'erro', 'Não foi possível salvar.');
    setLista((l) => l.map((x) => (x.id === s.id ? { ...x, sujo: false } : x)));
    aviso(s.id, 'ok', 'Salvo. Já está na página pública.'); router.refresh();
  }
  async function mover(i, d) {
    const j = i + d; if (j < 0 || j >= lista.length) return;
    const a = lista[i], b = lista[j];
    const [r1, r2] = await Promise.all([get().from('diretrizes_comunidade').update({ ordem: b.ordem }).eq('id', a.id), get().from('diretrizes_comunidade').update({ ordem: a.ordem }).eq('id', b.id)]);
    if (r1.error || r2.error) return aviso(a.id, 'erro', 'Não foi possível mudar a ordem.');
    const n = [...lista]; n[i] = { ...b, ordem: a.ordem }; n[j] = { ...a, ordem: b.ordem }; setLista(n.sort((x, y) => x.ordem - y.ordem)); router.refresh();
  }
  async function excluir(s) {
    if (!window.confirm(`Excluir a seção “${s.titulo}”?`)) return;
    const { error } = await get().from('diretrizes_comunidade').delete().eq('id', s.id);
    if (error) return aviso(s.id, 'erro', 'Não foi possível excluir.');
    setLista((l) => l.filter((x) => x.id !== s.id)); router.refresh();
  }
  async function criar(e) {
    e.preventDefault();
    const t = novo.trim(); if (t.length < 2) return;
    const ordem = Math.max(0, ...lista.map((s) => s.ordem)) + 1;
    const { data, error } = await get().from('diretrizes_comunidade').insert({ slug: `extra-${Date.now().toString(36)}`, titulo: t, conteudo: '', ordem, visivel: false }).select('id, slug, titulo, conteudo, ordem, visivel, padrao, atualizado_em').single();
    if (error) return aviso('novo', 'erro', 'Não foi possível criar a seção.');
    setLista((l) => [...l, data]); setNovo(''); aviso('novo', 'ok', 'Seção criada (escondida). Escreva o texto e marque “Mostrar para todos”.'); router.refresh();
  }

  return (<>
    {lista.map((s, i) => (
      <section className="card" key={s.id}>
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span>{s.padrao ? <span className="tag ok">Seção padrão</span> : <span className="tag">Seção sua</span>} {!s.visivel && <span className="tag">escondida</span>}</span>
          <span style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="btn o mini" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir seção">↑</button>
            <button type="button" className="btn o mini" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label="Descer seção">↓</button>
          </span>
        </div>
        <div className="campo"><label htmlFor={`t-${s.id}`}>Título</label><input id={`t-${s.id}`} value={s.titulo} maxLength={80} onChange={(e) => mudar(s.id, 'titulo', e.target.value)} /></div>
        <div className="campo"><label htmlFor={`c-${s.id}`}>Texto</label>
          <textarea id={`c-${s.id}`} rows={7} value={s.conteudo} maxLength={6000} onChange={(e) => mudar(s.id, 'conteudo', e.target.value)} />
          <small style={{ color: 'var(--suave)' }}>Dica: comece a linha com “- ” para criar uma lista. Linha em branco separa parágrafos.</small></div>
        <label style={{ display: 'block', margin: '6px 0' }}><input type="checkbox" checked={s.visivel} onChange={(e) => mudar(s.id, 'visivel', e.target.checked)} /> Mostrar para todos</label>
        {msg[s.id] && <div className={`msg ${msg[s.id].t}`} role="status">{msg[s.id].m}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn p mini" onClick={() => salvar(s)}>{s.sujo ? 'Salvar alterações' : 'Salvar'}</button>
          {!s.padrao && <button type="button" className="btn perigo mini" onClick={() => excluir(s)}>Excluir seção</button>}
        </div>
      </section>
    ))}
    <form className="card" onSubmit={criar}>
      <h3>➕ Nova seção</h3>
      <div className="campo"><label htmlFor="ns">Título da nova seção</label><input id="ns" value={novo} maxLength={80} onChange={(e) => setNovo(e.target.value)} placeholder="Ex.: Regras para eventos com bebida" /></div>
      {msg.novo && <div className={`msg ${msg.novo.t}`} role="status">{msg.novo.m}</div>}
      <button className="btn ouro mini" disabled={novo.trim().length < 2}>Criar seção</button>
    </form>
  </>);
}
