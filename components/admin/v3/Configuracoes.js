'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
const CAMPOS = [['aviso_geral', 'Aviso para todos os usuários (aparece no topo do app; deixe vazio para ocultar)', 'text'], ['limite_convites_dia', 'Convites de jogo por pessoa por dia (informativo)', 'number'], ['brinde_meta_padrao', 'Meta padrão de pontos para brinde (informativo)', 'number']];
export default function Configuracoes({ valores }) {
  const sb = useRef(null); const router = useRouter();
  const [v, setV] = useState(valores); const [msg, setMsg] = useState(null);
  async function salvar(e) {
    e.preventDefault(); setMsg(null);
    for (const [k] of CAMPOS) {
      const { error } = await (sb.current ||= criarCliente()).from('adm_config').upsert({ chave: k, valor: String(v[k] ?? '').slice(0, 300), atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
      if (error) { setMsg({ t: 'erro', m: 'Não foi possível salvar.' }); return; }
    }
    setMsg({ t: 'ok', m: 'Configurações salvas.' }); router.refresh();
  }
  return (
    <form className="card" onSubmit={salvar}>
      <h3>Configurações gerais</h3>
      {CAMPOS.map(([k, rot, tipo]) => <div className="campo" key={k}><label htmlFor={k}>{rot}</label><input id={k} type={tipo} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} maxLength={300} /></div>)}
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
      <button className="btn p">Salvar</button>
    </form>
  );
}
