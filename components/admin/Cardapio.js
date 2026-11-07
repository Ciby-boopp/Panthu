'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';

const preco = (v) => (v == null ? 'sem preço' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export default function Cardapio({ estabId, categorias }) {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const sb = criarCliente();

  async function exec(fn) {
    setMsg(null);
    const { error } = await fn();
    if (error) setMsg('Não foi possível salvar.'); else router.refresh();
    return !error;
  }
  async function novaCategoria(e) {
    e.preventDefault(); const form = e.target;
    const nome = String(new FormData(form).get('nome')).trim();
    if (await exec(() => sb.from('cardapio_categorias').insert({ estabelecimento_id: estabId, nome, ordem: categorias.length }))) form.reset();
  }
  async function novoItem(e, categoriaId) {
    e.preventDefault(); const form = e.target; const f = new FormData(form);
    const p = String(f.get('preco')).trim().replace(',', '.');
    if (p !== '' && (Number.isNaN(Number(p)) || Number(p) < 0)) { setMsg('Preço inválido.'); return; }
    const ok = await exec(() => sb.from('cardapio_itens').insert({
      categoria_id: categoriaId, nome: String(f.get('nome')).trim(),
      descricao: String(f.get('descricao')).trim() || null, preco: p === '' ? null : Number(p),
      beneficio_panthu: String(f.get('beneficio')).trim() || null
    }));
    if (ok) form.reset();
  }

  return (
    <div className="card">
      <h3>Cardápio digital</h3>
      {msg && <div className="msg erro">{msg}</div>}
      {categorias.length === 0 && <p style={{ color: 'var(--suave)' }}>Nenhuma categoria ainda. Crie a primeira abaixo (ex.: Bebidas, Petiscos, Pratos).</p>}
      {categorias.map(cat => (
        <div key={cat.id} style={{ marginTop: 18 }}>
          <div className="linha"><b>{cat.nome}</b>
            <button className="btn o mini" onClick={() => confirm(`Excluir a categoria "${cat.nome}" e seus itens?`) && exec(() => sb.from('cardapio_categorias').delete().eq('id', cat.id))}>Excluir categoria</button></div>
          {cat.cardapio_itens.map(it => (
            <div className="item" key={it.id}>
              <span>{it.nome} <b>· {preco(it.preco)}</b><small>{it.descricao}</small>
                {it.beneficio_panthu && <span className="tag ok">{it.beneficio_panthu}</span>}
                {!it.disponivel && <span className="tag">indisponível</span>}</span>
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn o mini" onClick={() => exec(() => sb.from('cardapio_itens').update({ disponivel: !it.disponivel }).eq('id', it.id))}>{it.disponivel ? 'Pausar' : 'Ativar'}</button>
                <button className="btn o mini" onClick={() => confirm(`Excluir "${it.nome}"?`) && exec(() => sb.from('cardapio_itens').delete().eq('id', it.id))}>Excluir</button>
              </span>
            </div>
          ))}
          <form onSubmit={(e) => novoItem(e, cat.id)} style={{ marginTop: 10 }}>
            <div className="dois">
              <div className="campo"><label>Item</label><input name="nome" required placeholder="Nome do item" /></div>
              <div className="campo"><label>Preço (R$)</label><input name="preco" inputMode="decimal" placeholder="0,00" /></div>
            </div>
            <div className="campo"><label>Descrição</label><input name="descricao" /></div>
            <div className="campo"><label>Benefício Panthu (opcional)</label><input name="beneficio" placeholder="Ex.: 10% de desconto" /></div>
            <button className="btn s mini">+ Adicionar item em {cat.nome}</button>
          </form>
        </div>
      ))}
      <form onSubmit={novaCategoria} style={{ marginTop: 22, borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
        <div className="campo"><label htmlFor="nc">Nova categoria</label><input id="nc" name="nome" required placeholder="Ex.: Bebidas" /></div>
        <button className="btn p mini">+ Criar categoria</button>
      </form>
    </div>
  );
}
