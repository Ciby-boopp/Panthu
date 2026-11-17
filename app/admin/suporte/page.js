import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
import ResponderTicket from '@/components/admin/v3/ResponderTicket';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Atendimento e segurança' };
const ROT = { aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['atendimento', 'seguranca'], 'atendimento');
  const status = ['aberto', 'em_andamento', 'resolvido'].includes(sp?.status) ? sp.status : 'aberto';
  const sb = await criarServidor();
  let conteudo;
  if (aba === 'atendimento') {
    const { data, error } = await sb.from('suporte_tickets').select('id, assunto, mensagem, status, resposta, criado_em, perfis(id, nome, email)').eq('status', status).order('criado_em', { ascending: false }).limit(50);
    conteudo = (<>
      <Aviso erro={error} />
      <div className="j-acoes" style={{ justifyContent: 'flex-start' }}>{Object.entries(ROT).map(([v, t]) => <Link key={v} className={`btn mini ${status === v ? 'p' : 'o'}`} href={`/admin/suporte?aba=atendimento&status=${v}`}>{t}</Link>)}</div>
      {(data || []).length === 0 && !error && <div className="card vazio">Nenhum chamado {ROT[status].toLowerCase()}.</div>}
      {(data || []).map((t) => (
        <section className="card" key={t.id}><b>{t.assunto}</b> <span className="tag">{ROT[t.status]}</span>
          <small style={{ display: 'block', color: 'var(--suave)' }}>{t.perfis?.nome} · {t.perfis?.email} · {dataHora(t.criado_em)}</small>
          <p style={{ whiteSpace: 'pre-line' }}>{t.mensagem}</p>
          <ResponderTicket t={t} /></section>
      ))}
    </>);
  } else {
    const [{ data: bloq }, { count: abertas }, { count: analise }] = await Promise.all([
      sb.from('perfis').select('id, nome, email').eq('bloqueado', true).limit(50),
      sb.from('denuncias').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
      sb.from('denuncias').select('*', { count: 'exact', head: true }).eq('status', 'em_analise'),
    ]);
    conteudo = (<>
      <div className="stats"><div className="stat"><div className="num">{abertas || 0}</div><span>Denúncias abertas</span></div><div className="stat"><div className="num">{analise || 0}</div><span>Em análise</span></div><div className="stat"><div className="num">{(bloq || []).length}</div><span>Contas bloqueadas</span></div></div>
      <p><Link className="btn p mini" href="/admin/denuncias">Abrir denúncias</Link></p>
      <section className="card"><h3>Contas bloqueadas</h3>{(bloq || []).length === 0 ? <p className="vazio">Nenhuma conta bloqueada.</p> : bloq.map((u) => <div className="item" key={u.id}><Link href={`/admin/usuarios/${u.id}`}>{u.nome}</Link><small>{u.email}</small></div>)}</section>
    </>);
  }
  return (<>
    <h1 style={{ fontSize: 30 }}>Denúncias e suporte</h1>
    <AdmAbas base="/admin/suporte" itens={[['/admin/denuncias', 'Denúncias'], ['atendimento', 'Atendimento'], ['seguranca', 'Segurança']]} ativo={aba} />
    {conteudo}
  </>);
}
