import Link from 'next/link';
import { notFound } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import AcoesPessoa from '@/components/AcoesPessoa';
import AmigoBotao from '@/components/AmigoBotao';
import '@/components/chat.css';
export const dynamic = 'force-dynamic';
export default async function Pessoa({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.rpc('perfil_pessoa', { p_id: id });
  const p = data?.[0];
  if (!p) notFound();
  const { data: ep } = p.sou_eu ? { data: null } : await sb.rpc('estado_pedido', { outro: p.id });
  const e = ep?.[0] || { estado: 'nenhum', sala_id: null, pedido_id: null };
  return (<>
    <p><Link href="/app/chat">← Voltar</Link></p>
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar url={p.foto_url} nome={p.nome} tam={120} /></div>
      <h1 style={{ fontSize: 28, marginTop: 12 }}>{p.nome}</h1>
      <p style={{ whiteSpace: 'pre-line', color: p.bio ? 'inherit' : 'var(--suave)' }}>{p.bio || 'Ainda não escreveu uma biografia.'}</p>
      {p.sou_eu
        ? <Link className="btn p" href="/app/perfil">Editar meu perfil</Link>
        : <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
            <AmigoBotao id={p.id} euId={user.id} inicial={p.eh_amigo} />
            <div className="pessoa-linha" style={{ justifyContent: 'center', borderBottom: 0 }}>
              <AcoesPessoa id={p.id} estado={e.estado} salaId={e.sala_id} pedidoId={e.pedido_id} mesmoEvento={p.mesmo_evento} />
            </div>
            {e.estado === 'nenhum' && !p.mesmo_evento && <p style={{ color: 'var(--suave)', fontSize: 14, margin: 0 }}>Para conversar em particular, a pessoa precisa aceitar o seu pedido.</p>}
          </div>}
    </div>
  </>);
}
