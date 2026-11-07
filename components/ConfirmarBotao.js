'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function ConfirmarBotao({ eventoId, usuarioId, confirmado }) {
  const [carregando, setC] = useState(false);
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  async function mudar(status) {
    setC(true); setMsg(null);
    const { error } = await criarCliente().from('confirmacoes')
      .upsert({ evento_id: eventoId, usuario_id: usuarioId, status }, { onConflict: 'evento_id,usuario_id' });
    setC(false);
    if (error) { setMsg(error.message.includes('lotado') ? 'Este evento está lotado.' : 'Não foi possível concluir. Tente de novo.'); return; }
    router.refresh();
  }
  return (
    <div>
      {confirmado
        ? <button className="btn o" disabled={carregando} onClick={() => mudar('cancelado')}>{carregando ? 'Cancelando…' : 'Cancelar minha presença'}</button>
        : <button className="btn p" disabled={carregando} onClick={() => mudar('confirmado')}>{carregando ? 'Confirmando…' : 'Confirmar presença'}</button>}
      {msg && <div className="msg erro">{msg}</div>}
    </div>
  );
}
