'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function NovoLancamento() {
  const sb = useRef(null); const router = useRouter();
  const [msg, setMsg] = useState(null); const [c, setC] = useState(false);
  async function salvar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target);
    const dados = { tipo: f.get('tipo'), valor: Number(String(f.get('valor')).replace(',', '.')), data: f.get('data'), status: f.get('status'), descricao: String(f.get('descricao') || '').trim() || null, categoria: String(f.get('categoria') || '').trim() || null };
    if (!(dados.valor > 0)) { setMsg('Informe um valor maior que zero.'); setC(false); return; }
    const { error } = await (sb.current ||= criarCliente()).from('financeiro').insert(dados);
    setC(false);
    if (error) setMsg('Não foi possível salvar o lançamento.'); else { e.target.reset(); router.refresh(); }
  }
  return (
    <form className="card" onSubmit={salvar}>
      <h3>Novo lançamento</h3>
      <div className="dois">
        <div className="campo"><label htmlFor="ft">Tipo</label><select id="ft" name="tipo" defaultValue="receita"><option value="receita">Receita</option><option value="despesa">Despesa</option></select></div>
        <div className="campo"><label htmlFor="fv">Valor (R$)</label><input id="fv" name="valor" inputMode="decimal" required /></div>
        <div className="campo"><label htmlFor="fd">Data</label><input id="fd" name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
        <div className="campo"><label htmlFor="fs">Situação</label><select id="fs" name="status" defaultValue="pago"><option value="pago">Pago</option><option value="pendente">Pendente</option></select></div>
        <div className="campo"><label htmlFor="fc">Categoria</label><input id="fc" name="categoria" maxLength={60} placeholder="Ex.: Parceria, Estrutura" /></div>
        <div className="campo"><label htmlFor="fe">Descrição</label><input id="fe" name="descricao" maxLength={160} /></div>
      </div>
      {msg && <p className="msg erro" role="status">{msg}</p>}
      <button className="btn p mini" disabled={c}>{c ? 'Salvando…' : 'Registrar'}</button>
    </form>
  );
}
