import { criarServidor } from '@/lib/supabase/server';
import Sala from '@/components/Sala';
import CabecalhoSala from '@/components/chat/CabecalhoSala';
export const dynamic = 'force-dynamic';

// No computador, abrir o Chat já mostra a comunidade ao lado da lista. No celular a lista aparece primeiro.
export default async function Chat() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: sala } = await sb.from('chat_salas').select('id, nome').eq('tipo', 'geral').maybeSingle();
  if (!sala) return <div className="card vazio" style={{ margin: 16 }}><h3>Chat da comunidade indisponível</h3><p>Avise a equipe do Panthu.</p></div>;
  const { data: msgs } = await sb.rpc('mensagens_sala', { sl: sala.id, limite: 100 });
  return (<>
    <CabecalhoSala titulo={sala.nome || 'Comunidade'} tipo="geral" />
    <Sala salaId={sala.id} usuarioId={user.id} inicial={msgs || []} />
  </>);
}
