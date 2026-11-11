import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import Sala from '@/components/Sala';
import '@/components/chat.css';
export const dynamic = 'force-dynamic';

const ABAS = [['comunidade', 'Comunidade'], ['eventos', 'Dos eventos'], ['privadas', 'Privadas']];
const DICA = {
  comunidade: 'Aqui conversa todo mundo do Panthu.',
  eventos: 'Salas liberadas só para quem confirmou presença no encontro.',
  privadas: 'Conversas entre duas pessoas que vão ao mesmo evento.'
};

export default async function Chat({ searchParams }) {
  const sp = await searchParams;
  const aba = ABAS.some(a => a[0] === sp?.aba) ? sp.aba : 'comunidade';
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  let conteudo;

  if (aba === 'comunidade') {
    const { data: sala } = await sb.from('chat_salas').select('id').eq('tipo', 'geral').maybeSingle();
    if (!sala) conteudo = <div className="card vazio"><h3>Chat da comunidade indisponível</h3><p>Avise a equipe do Panthu.</p></div>;
    else {
      const { data: msgs } = await sb.rpc('mensagens_sala', { sl: sala.id, limite: 100 });
      conteudo = <Sala salaId={sala.id} usuarioId={user.id} inicial={msgs || []} />;
    }
  } else {
    const { data } = await sb.rpc('minhas_conversas');
    const lista = (data || []).filter(c => aba === 'eventos' ? c.tipo === 'evento' : !['evento', 'geral'].includes(c.tipo));
    conteudo = (<>
      {lista.length === 0 && <div className="card vazio"><h3>{aba === 'eventos' ? 'Nenhum chat de evento ainda' : 'Nenhuma conversa privada ainda'}</h3>
        <p>{aba === 'eventos' ? 'Confirme presença em um encontro para entrar no chat dele.' : 'Toque em Conversar no perfil de quem vai ao mesmo evento que você.'}</p></div>}
      {lista.map(c => (
        <Link key={c.sala_id} href={`/app/chat/${c.sala_id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <b>{c.titulo}</b>
          {c.ultima && <><br /><small style={{ color: 'var(--suave)' }}>Última mensagem: {new Date(c.ultima).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}</small></>}
        </Link>
      ))}
    </>);
  }

  return (<>
    <h1 style={{ fontSize: 32 }}>Chat</h1>
    <div className="abas">
      {ABAS.map(([v, t]) => <Link key={v} href={`/app/chat?aba=${v}`} className={`btn mini ${aba === v ? 'p' : 'o'}`}>{t}</Link>)}
    </div>
    <p style={{ color: 'var(--suave)', margin: '0 0 6px' }}>{DICA[aba]}</p>
    {conteudo}
  </>);
}
