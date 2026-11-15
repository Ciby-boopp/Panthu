'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';

// Admin: regras de pontos e brindes editáveis.
export default function PontosAdmin({ regras, brindes }) {
  const sb = useRef(null);
  const router = useRouter();
  const [r, setR] = useState(regras);
  const [b, setB] = useState(brindes);
  const [msg, setMsg] = useState(null);
  const cli = () => (sb.current ||= criarCliente());
  const mudaR = (cod, campo, v) => setR((l) => l.map((x) => (x.codigo === cod ? { ...x, [campo]: v } : x)));
  const mudaB = (id, campo, v) => setB((l) => l.map((x) => (x.id === id ? { ...x, [campo]: v } : x)));

  async function salvar() {
    setMsg(null);
    for (const x of r) {
      const { error } = await cli().from('pontos_regras').update({ pontos: Math.max(0, Math.min(1000, Number(x.pontos) || 0)), limite_dia: x.limite_dia === '' || x.limite_dia == null ? null : Math.max(0, Number(x.limite_dia)), ativo: x.ativo }).eq('codigo', x.codigo);
      if (error) { setMsg({ t: 'erro', m: 'Não foi possível salvar as regras.' }); return; }
    }
    for (const x of b) {
      const dados = { nome: x.nome.trim(), descricao: x.descricao || null, meta: Math.max(1, Number(x.meta) || 100), ativo: x.ativo };
      const { error } = x.novo ? await cli().from('pontos_brindes').insert(dados) : await cli().from('pontos_brindes').update(dados).eq('id', x.id);
      if (error) { setMsg({ t: 'erro', m: 'Não foi possível salvar os brindes.' }); return; }
    }
    setMsg({ t: 'ok', m: 'Salvo! As mudanças valem para os próximos pontos.' }); router.refresh();
  }
  return (<>
    <section className="card" aria-label="Regras de pontos">
      <h3>Regras de pontos</h3>
      {r.map((x) => (
        <div className="item" key={x.codigo} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 220px' }}><b>{x.nome}</b><small>{x.descricao}{x.unico ? ' (ganha uma vez só)' : ''}</small></span>
          <label style={{ fontSize: 13 }}>Pontos<input type="number" min="0" max="1000" value={x.pontos} onChange={(e) => mudaR(x.codigo, 'pontos', e.target.value)} style={{ width: 90 }} /></label>
          <label style={{ fontSize: 13 }}>Limite/dia<input type="number" min="0" value={x.limite_dia ?? ''} placeholder="sem" onChange={(e) => mudaR(x.codigo, 'limite_dia', e.target.value)} style={{ width: 90 }} /></label>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={x.ativo} onChange={(e) => mudaR(x.codigo, 'ativo', e.target.checked)} />Ativa</label>
        </div>
      ))}
    </section>
    <section className="card" aria-label="Brindes">
      <h3>Brindes (cupom automático ao atingir a meta)</h3>
      {b.map((x) => (
        <div className="item" key={x.id} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 200px', fontSize: 13 }}>Nome<input value={x.nome} onChange={(e) => mudaB(x.id, 'nome', e.target.value)} maxLength={80} /></label>
          <label style={{ flex: '1 1 200px', fontSize: 13 }}>Descrição<input value={x.descricao || ''} onChange={(e) => mudaB(x.id, 'descricao', e.target.value)} maxLength={160} /></label>
          <label style={{ fontSize: 13 }}>Meta (pontos)<input type="number" min="1" value={x.meta} onChange={(e) => mudaB(x.id, 'meta', e.target.value)} style={{ width: 100 }} /></label>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={x.ativo} onChange={(e) => mudaB(x.id, 'ativo', e.target.checked)} />Ativo</label>
        </div>
      ))}
      <button className="btn o mini" onClick={() => setB((l) => [...l, { id: `novo-${l.length}`, novo: true, nome: 'Novo brinde', descricao: '', meta: 200, ativo: true }])}>+ Adicionar brinde</button>
    </section>
    {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
    <button className="btn p" onClick={salvar}>Salvar tudo</button>
  </>);
}
