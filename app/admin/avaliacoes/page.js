import { criarServidor } from '@/lib/supabase/server';
import { quando } from '@/lib/util';
export const dynamic = 'force-dynamic';
const media = (v) => { const n = v.filter(x => x != null); return n.length ? (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1).replace('.', ',') : '—'; };
export default async function Avaliacoes() {
  const sb = await criarServidor();
  const { data, error } = await sb.from('avaliacoes')
    .select('evento_id, nota_geral, organizacao, estrutura, interacao, comentario, atualizado_em, eventos(nome, inicio), perfis(nome)')
    .order('atualizado_em', { ascending: false });
  const grupos = new Map();
  (data || []).forEach(a => { const k = a.evento_id; if (!grupos.has(k)) grupos.set(k, { nome: a.eventos?.nome || 'Evento', inicio: a.eventos?.inicio, itens: [] }); grupos.get(k).itens.push(a); });
  return (<>
    <h1 style={{ fontSize: 30 }}>Avaliações dos eventos</h1>
    <p style={{ color: 'var(--suave)' }}>Feedback interno para melhorar a plataforma. Não é exibido aos participantes.</p>
    {error && <div className="msg erro">Não foi possível carregar. Confira se o SQL das novas funcionalidades foi executado no Supabase.</div>}
    {!error && grupos.size === 0 && <div className="card vazio"><h3>Nenhuma avaliação ainda</h3><p>Elas aparecem aqui depois que os participantes avaliarem um evento.</p></div>}
    {[...grupos.entries()].map(([id, g]) => (
      <div className="card" key={id}>
        <div className="linha"><div><h3>{g.nome}</h3>{g.inicio && <small style={{ color: 'var(--suave)' }}>{quando(g.inicio)}</small>}</div>
          <div style={{ textAlign: 'right' }}><div className="num">{media(g.itens.map(i => i.nota_geral))} <span style={{ fontSize: 18, color: 'var(--ouro)' }}>★</span></div><small>{g.itens.length} avaliação(ões)</small></div></div>
        <div style={{ margin: '8px 0' }}>
          <span className="tag">Organização {media(g.itens.map(i => i.organizacao))}</span>
          <span className="tag">Local e estrutura {media(g.itens.map(i => i.estrutura))}</span>
          <span className="tag">Interação {media(g.itens.map(i => i.interacao))}</span>
        </div>
        {g.itens.filter(i => i.comentario).map((i, n) => (
          <div className="item" key={n}><span>{i.comentario}<small>{i.perfis?.nome || 'Participante'} · {i.nota_geral} de 5 · {quando(i.atualizado_em)}</small></span></div>))}
      </div>))}
  </>);
}
