import { notFound } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
import Sala from '@/components/Sala';
import CabecalhoSala from '@/components/chat/CabecalhoSala';
export const dynamic = 'force-dynamic';

export default async function SalaPage({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: sala } = await sb.from('chat_salas').select('id, nome, tipo').eq('id', id).maybeSingle();
  if (!sala) notFound();
  let titulo = sala.tipo === 'geral' ? (sala.nome || 'Comunidade') : null;
  if (!titulo) { const { data: t } = await sb.rpc('titulo_sala', { sl: id }); titulo = t; }
  if (!titulo) notFound();
  const { data: msgs } = await sb.rpc('mensagens_sala', { sl: id, limite: 100 });
  return (<>
    <CabecalhoSala titulo={titulo} tipo={sala.tipo} />
    <Sala salaId={id} usuarioId={user.id} inicial={msgs || []} />
  </>);
}
