import Link from 'next/link';
import { notFound } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
import Sala from '@/components/Sala';
export const dynamic = 'force-dynamic';
export default async function SalaPage({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: titulo } = await sb.rpc('titulo_sala', { sl: id });
  if (!titulo) notFound();
  const { data: msgs } = await sb.rpc('mensagens_sala', { sl: id, limite: 100 });
  return (<>
    <p><Link href="/app/chat">← Chat</Link></p>
    <h1 style={{ fontSize: 26, marginBottom: 8 }}>{titulo}</h1>
    <Sala salaId={id} usuarioId={user.id} inicial={msgs || []} />
  </>);
}
