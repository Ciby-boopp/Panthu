import Link from 'next/link';
import BotaoVoltar from '@/components/BotaoVoltar';
import QueroSerHost from '@/components/QueroSerHost';
import { criarServidor } from '@/lib/supabase/server';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quero ser host' };

export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel, cidade').eq('id', user.id).single();
  const { data: pedidos } = await sb.from('host_pedidos').select('id, status, resposta_admin, criado_em, decidido_em').eq('usuario_id', user.id).order('criado_em', { ascending: false }).limit(1);
  const ultimo = pedidos?.[0];
  const jaHost = ['host', 'admin'].includes(p?.papel);
  return (<>
    <p><BotaoVoltar href="/app/perfil" className="btn o mini">← Voltar</BotaoVoltar></p>
    <h1 style={{ fontSize: 30 }}>Quero ser host</h1>
    <p style={{ color: 'var(--suave)' }}>O host recebe as pessoas nos encontros, confere a presença, organiza as mesas e cuida para que todos se sintam bem. Conte um pouco sobre você e a equipe do Panthu vai analisar.</p>
    {jaHost ? (
      <div className="card"><h3>Você já é host 🎉</h3><p>Abra a Área do Host para ver os seus eventos.</p><Link className="btn p" href="/host">Abrir Área do Host</Link></div>
    ) : ultimo?.status === 'pendente' ? (
      <div className="card"><h3>Pedido em análise ⏳</h3><p>Recebemos o seu pedido em {dataHora(ultimo.criado_em)}. A equipe vai analisar e você será avisada aqui. Não precisa enviar de novo.</p></div>
    ) : (<>
      {ultimo?.status === 'recusado' && (
        <div className="card"><h3>Seu último pedido não foi aprovado</h3>
          {ultimo.resposta_admin && <p style={{ whiteSpace: 'pre-line' }}>Recado da equipe: “{ultimo.resposta_admin}”</p>}
          <p>Você pode enviar um novo pedido abaixo quando quiser.</p></div>
      )}
      <QueroSerHost cidadeInicial={p?.cidade || ''} />
    </>)}
  </>);
}
