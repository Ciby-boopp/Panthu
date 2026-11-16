'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
const TABELAS = [['perfis', 'Usuários (sem telefone)'], ['eventos', 'Eventos'], ['confirmacoes', 'Presenças'], ['estabelecimentos', 'Estabelecimentos'], ['financeiro', 'Financeiro'], ['jogos_partidas', 'Partidas de jogos'], ['pontos_lancamentos', 'Pontos']];
export default function Backup() {
  const sb = useRef(null); const router = useRouter();
  const [msg, setMsg] = useState(null); const [c, setC] = useState('');
  async function baixar(t) {
    setC(t); setMsg(null);
    const { data, error } = await (sb.current ||= criarCliente()).rpc('adm_exportar', { p_tabela: t });
    setC('');
    if (error) { setMsg({ t: 'erro', m: 'Não foi possível exportar agora.' }); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `panthu-${t}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    await sb.current.from('adm_backups').insert({ tipo: 'exportacao', observacao: `Exportação de ${t} (${data.length} linhas)` });
    router.refresh();
  }
  async function registrar(e) {
    e.preventDefault();
    const obs = String(new FormData(e.target).get('obs') || '').trim();
    const { error } = await (sb.current ||= criarCliente()).from('adm_backups').insert({ tipo: 'supabase', observacao: obs || 'Backup conferido no Supabase' });
    if (error) setMsg({ t: 'erro', m: 'Não foi possível registrar.' }); else { e.target.reset(); router.refresh(); }
  }
  return (<>
    <section className="card"><h3>Baixar uma cópia dos dados</h3>
      <p style={{ color: 'var(--suave)', marginTop: 4 }}>Gera um arquivo para guardar com você. Cada download fica registrado na auditoria.</p>
      <div className="j-acoes" style={{ justifyContent: 'flex-start' }}>{TABELAS.map(([t, n]) => <button key={t} className="btn o mini" disabled={!!c} onClick={() => baixar(t)}>{c === t ? 'Gerando…' : n}</button>)}</div>
    </section>
    <form className="card" onSubmit={registrar}>
      <h3>Registrar backup do Supabase</h3>
      <p style={{ color: 'var(--suave)', marginTop: 4 }}>O Supabase guarda backups automáticos (Database → Backups). Anote aqui quando você conferiu ou baixou um.</p>
      <div className="campo"><label htmlFor="obs">Observação</label><input id="obs" name="obs" maxLength={200} placeholder="Ex.: Backup diário conferido" /></div>
      <button className="btn s mini">Registrar</button>
    </form>
    {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
  </>);
}
