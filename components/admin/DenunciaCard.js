'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';
import { quando } from '@/lib/util';

export default function DenunciaCard({ d }) {
  const router = useRouter();
  const sb = criarCliente();
  const [status, setStatus] = useState(d.status);
  const [prov, setProv] = useState(d.providencias || '');
  const [msg, setMsg] = useState(null);
  const fim = (error, m) => { setMsg(error ? { t: 'erro', m: 'Não foi possível concluir.' } : { t: 'ok', m }); if (!error) router.refresh(); };

  async function salvar() {
    const { error } = await sb.from('denuncias').update({ status, providencias: prov.trim() || null }).eq('id', d.id);
    fim(error, 'Denúncia atualizada.');
  }
  async function bloquear() {
    if (!confirm(`Bloquear ${d.denunciado.nome}? A pessoa perde o acesso ao Panthu.`)) return;
    const { error } = await sb.from('perfis').update({ bloqueado: true }).eq('id', d.denunciado.id);
    fim(error, 'Usuário bloqueado.');
  }
  async function apagar() {
    if (!confirm('Apagar esta mensagem do chat? O texto continua guardado na denúncia.')) return;
    const { error } = await sb.from('mensagens').delete().eq('id', d.mensagem_id);
    fim(error, 'Mensagem apagada.');
  }

  return (
    <div className="card">
      <div className="linha"><b>{d.denunciado?.nome}</b><span className="tag">{quando(d.criado_em)}</span></div>
      <p style={{ margin: '4px 0' }}>Denunciado por <b>{d.autor?.nome}</b></p>
      <p><b>Motivo:</b> {d.motivo}</p>
      {d.mensagem_texto && <p style={{ background: 'var(--lilas)', borderRadius: 14, padding: 10 }}>“{d.mensagem_texto}”</p>}
      <div className="campo"><label>Situação</label>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="aberta">Aberta</option><option value="em_analise">Em análise</option><option value="resolvida">Resolvida</option></select></div>
      <div className="campo"><label>Providências tomadas</label><textarea value={prov} onChange={e => setProv(e.target.value)} /></div>
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
      <div className="linha" style={{ justifyContent: 'flex-start' }}>
        <button className="btn p mini" onClick={salvar}>Salvar</button>
        {d.mensagem_id && <button className="btn o mini" onClick={apagar}>Apagar mensagem</button>}
        {!d.denunciado?.bloqueado && <button className="btn perigo mini" onClick={bloquear}>Bloquear usuário</button>}
        <Link className="btn o mini" href={`/admin/usuarios/${d.denunciado?.id}`}>Ver perfil</Link>
      </div>
    </div>
  );
}
