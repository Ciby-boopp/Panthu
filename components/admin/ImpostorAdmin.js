'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';

// Painel do ADM: categorias e palavras do jogo e denúncias de jogadores.
export default function ImpostorAdmin({ modo = 'palavras', categorias = [], palavras = [], denuncias = [] }) {
  const router = useRouter();
  const [sb] = useState(() => criarCliente());
  const [msg, setMsg] = useState(null);
  const [sel, setSel] = useState(categorias[0]?.id || null);
  const [edit, setEdit] = useState(null);
  const run = async (p) => { const { error } = await p; if (error) setMsg(error.message); else { setMsg(null); router.refresh(); } };

  if (modo === 'denuncias') return (
    <section className="card"><h3>Denúncias de jogadores</h3>
      {msg && <p className="msg erro">{msg}</p>}
      {denuncias.length === 0 ? <p className="vazio">Nenhuma denúncia.</p> : denuncias.map((d) => (
        <div className="item" key={d.id} style={{ opacity: d.resolvida ? 0.55 : 1 }}>
          <span><b>{d.alvoNome}</b> <small>denunciado por {d.porNome} · sala {d.codigo} · {d.quando}</small><small>“{d.motivo}”</small></span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Link className="btn perigo mini" href={`/admin/usuarios?q=${encodeURIComponent(d.alvoNome)}`}>Ver/bloquear usuário</Link>
            <button className="btn o mini" onClick={() => run(sb.from('imp_denuncias').update({ resolvida: !d.resolvida }).eq('id', d.id))}>{d.resolvida ? 'Reabrir' : 'Marcar resolvida'}</button>
          </span>
        </div>))}
    </section>
  );

  const doCat = palavras.filter((p) => p.categoria_id === sel);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {msg && <p className="msg erro">{msg}</p>}
      <section className="card"><h3>Categorias</h3>
        <div className="chips-lista">{categorias.map((c) => <button key={c.id} className={`chip ${sel === c.id ? 'on' : ''}`} style={{ opacity: c.ativa ? 1 : 0.5 }} onClick={() => setSel(c.id)}>{c.nome} ({palavras.filter((p) => p.categoria_id === c.id).length})</button>)}</div>
        <form style={{ display: 'flex', gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); const n = new FormData(e.target).get('nome').trim(); if (n) { run(sb.from('imp_categorias').insert({ nome: n })); e.target.reset(); } }}>
          <input name="nome" placeholder="Nova categoria" maxLength={40} required /><button className="btn p mini">Adicionar</button>
        </form>
        {sel && <div className="linha" style={{ marginTop: 10, gap: 8 }}>
          <button className="btn o mini" onClick={() => { const c = categorias.find((x) => x.id === sel); run(sb.from('imp_categorias').update({ ativa: !c.ativa }).eq('id', sel)); }}>{categorias.find((x) => x.id === sel)?.ativa ? 'Desativar categoria' : 'Ativar categoria'}</button>
          <button className="btn perigo mini" onClick={() => { if (confirm('Excluir a categoria e todas as palavras dela?')) { run(sb.from('imp_categorias').delete().eq('id', sel)); setSel(null); } }}>Excluir categoria</button>
        </div>}
      </section>
      {sel && (
        <section className="card"><h3>Palavras de {categorias.find((c) => c.id === sel)?.nome}</h3>
          <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); const n = new FormData(e.target).get('palavra').trim(); if (n) { run(sb.from('imp_palavras').insert({ categoria_id: sel, palavra: n })); e.target.reset(); } }}>
            <input name="palavra" placeholder="Nova palavra" maxLength={40} required /><button className="btn p mini">Adicionar</button>
          </form>
          {doCat.length === 0 ? <p className="vazio">Sem palavras.</p> : doCat.map((p) => (
            <div className="item" key={p.id} style={{ opacity: p.ativa ? 1 : 0.5 }}>
              {edit?.id === p.id
                ? <form style={{ display: 'flex', gap: 6, flex: 1 }} onSubmit={(e) => { e.preventDefault(); run(sb.from('imp_palavras').update({ palavra: edit.palavra.trim() }).eq('id', p.id)); setEdit(null); }}><input value={edit.palavra} maxLength={40} onChange={(e) => setEdit({ id: p.id, palavra: e.target.value })} autoFocus /><button className="btn p mini">Salvar</button></form>
                : <b>{p.palavra}</b>}
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn o mini" onClick={() => setEdit({ id: p.id, palavra: p.palavra })}>Editar</button>
                <button className="btn o mini" onClick={() => run(sb.from('imp_palavras').update({ ativa: !p.ativa }).eq('id', p.id))}>{p.ativa ? 'Desativar' : 'Ativar'}</button>
                <button className="btn perigo mini" onClick={() => { if (confirm(`Excluir “${p.palavra}”?`)) run(sb.from('imp_palavras').delete().eq('id', p.id)); }}>Excluir</button>
              </span>
            </div>))}
        </section>
      )}
    </div>
  );
}
