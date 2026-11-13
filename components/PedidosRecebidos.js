'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import Avatar from './Avatar';
import './chat.css';

export default function PedidosRecebidos({ lista }) {
  const [itens, setItens] = useState(lista);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const router = useRouter();
  const sb = criarCliente();

  async function responder(p, acao) {
    setOcupado(p.id); setMsg(null);
    const { data, error } = await sb.rpc('responder_pedido', { p_id: p.id, p_acao: acao });
    setOcupado(null);
    if (error) return setMsg('Não foi possível responder agora.');
    setItens((x) => x.filter((i) => i.id !== p.id));
    if (acao === 'aceitar' && data) router.push(`/app/chat/${data}`);
    else router.refresh();
  }
  if (!itens.length) return null;
  return (
    <section className="card" aria-label="Pedidos para conversar">
      <h3>Pedidos para conversar ({itens.length})</h3>
      {msg && <div className="msg erro" role="status">{msg}</div>}
      {itens.map((p) => (
        <div className="pessoa-linha" key={p.id}>
          <Link className="pessoa-link" href={`/app/pessoa/${p.de}`}><Avatar url={p.foto_url} nome={p.nome} tam={36} />{p.nome}</Link>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn p mini" onClick={() => responder(p, 'aceitar')} disabled={ocupado === p.id}>Aceitar</button>
            <button className="btn o mini" onClick={() => responder(p, 'recusar')} disabled={ocupado === p.id}>Recusar</button>
            <button className="btn o mini" onClick={() => responder(p, 'bloquear')} disabled={ocupado === p.id} title="Não receber mais pedidos desta pessoa">Bloquear</button>
          </span>
        </div>
      ))}
    </section>
  );
}
