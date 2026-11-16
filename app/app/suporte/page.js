import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import SuporteForm from '@/components/SuporteForm';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suporte' };
const ROT = { aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido' };
export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: tickets, error } = await sb.from('suporte_tickets').select('id, assunto, status, resposta, criado_em').eq('usuario_id', user.id).order('criado_em', { ascending: false }).limit(10);
  return (<>
    <p><Link href="/app/perfil">← Perfil</Link></p>
    <h1 style={{ fontSize: 30 }}>Fale com o suporte</h1>
    <p style={{ color: 'var(--suave)' }}>Dúvida, problema ou sugestão? Escreva aqui. Para denunciar uma mensagem, use o botão de denúncia no chat.</p>
    {error ? <p className="msg erro">Suporte indisponível no momento.</p> : <SuporteForm />}
    {(tickets || []).map((t) => <section className="card" key={t.id}><b>{t.assunto}</b> <span className={`tag ${t.status === 'resolvido' ? 'ok' : ''}`}>{ROT[t.status]}</span><small style={{ display: 'block', color: 'var(--suave)' }}>{dataHora(t.criado_em)}</small>{t.resposta && <p style={{ whiteSpace: 'pre-line', marginBottom: 0 }}><b>Resposta:</b> {t.resposta}</p>}</section>)}
  </>);
}
