'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import './chat.css';

// estado: nenhum | enviado | recebido | aceito | espera
export default function AcoesPessoa({ id, estado: inicial = 'nenhum', salaId = null, pedidoId = null, mesmoEvento = false }) {
  const [estado, setEstado] = useState(inicial);
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const router = useRouter();
  const sb = criarCliente();
  const erro = (e, padrao) => setMsg({ t: 'erro', m: e?.message && !/^(new row|permission|PGRST)/i.test(e.message) ? e.message : padrao });

  async function pedir() {
    setOcupado(true); setMsg(null);
    const { data, error } = await sb.rpc('pedir_conversa', { outro: id });
    setOcupado(false);
    if (error) return erro(error, 'Não foi possível enviar o pedido agora.');
    const r = data?.[0];
    if (r?.estado === 'aceito' && r.sala_id) return router.push(`/app/chat/${r.sala_id}`);
    if (r?.estado === 'espera') { setEstado('espera'); return; }
    setEstado('enviado');
    setMsg({ t: 'ok', m: 'Pedido enviado. Você será avisado se for aceito.' });
  }
  async function cancelar() {
    setOcupado(true);
    const { error } = await sb.rpc('cancelar_pedido', { outro: id });
    setOcupado(false);
    if (error) return erro(error, 'Não foi possível cancelar.');
    setEstado('nenhum'); setMsg(null);
  }
  async function responder(acao) {
    setOcupado(true); setMsg(null);
    const { data, error } = await sb.rpc('responder_pedido', { p_id: pedidoId, p_acao: acao });
    setOcupado(false);
    if (error) return erro(error, 'Não foi possível responder ao pedido.');
    if (acao === 'aceitar' && data) return router.push(`/app/chat/${data}`);
    setEstado('fim');
    setMsg({ t: 'ok', m: acao === 'bloquear' ? 'Pedidos dessa pessoa bloqueados.' : 'Pedido recusado.' });
  }
  async function denunciar(e) {
    e.preventDefault();
    const motivo = String(new FormData(e.target).get('motivo'));
    const { error } = await sb.rpc('denunciar_usuario', { p_usuario: id, p_motivo: motivo });
    setAberto(false);
    setMsg(error ? { t: 'erro', m: 'Não foi possível enviar. Descreva o motivo com pelo menos 5 caracteres.' } : { t: 'ok', m: 'Denúncia enviada. A equipe vai analisar.' });
  }
  return (<>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      {estado === 'aceito' && <button className="btn s mini" onClick={() => router.push(`/app/chat/${salaId}`)}>Conversar</button>}
      {estado === 'nenhum' && <button className="btn s mini" onClick={pedir} disabled={ocupado}>{mesmoEvento ? 'Conversar' : 'Pedir para conversar'}</button>}
      {estado === 'enviado' && <><span className="tag">Pedido enviado</span><button className="btn o mini" onClick={cancelar} disabled={ocupado}>Cancelar pedido</button></>}
      {estado === 'espera' && <span className="tag">Tente de novo mais tarde</span>}
      {estado === 'recebido' && <>
        <span style={{ fontWeight: 600 }}>Quer conversar com você</span>
        <button className="btn p mini" onClick={() => responder('aceitar')} disabled={ocupado}>Aceitar</button>
        <button className="btn o mini" onClick={() => responder('recusar')} disabled={ocupado}>Recusar</button>
        <button className="btn o mini" onClick={() => responder('bloquear')} disabled={ocupado}>Bloquear pedidos</button>
      </>}
      <button className="btn o mini" onClick={() => setAberto(!aberto)}>Denunciar</button>
    </div>
    {msg && <div className={`msg ${msg.t}`} role="status" style={{ flexBasis: '100%' }}>{msg.m}</div>}
    {aberto && (
      <form onSubmit={denunciar} style={{ flexBasis: '100%' }}>
        <textarea name="motivo" required minLength={5} maxLength={500} placeholder="Descreva o comportamento inadequado" />
        <button className="btn p mini" style={{ marginTop: 6 }}>Enviar denúncia</button>
      </form>
    )}
  </>);
}
