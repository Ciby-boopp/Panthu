import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import DecidirHost from '@/components/admin/DecidirHost';
import { Aviso } from '@/components/admin/AdmAbas';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pedidos para ser host' };
const ROT = { pendente: 'Pendentes', aprovado: 'Aprovados', recusado: 'Recusados' };
const DISP = { semana_noite: 'Durante a semana, à noite', fim_de_semana: 'Nos fins de semana', qualquer_dia: 'Qualquer dia' };

export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const status = Object.keys(ROT).includes(sp?.status) ? sp.status : 'pendente';
  const sb = await criarServidor();
  const [{ data, error }, { count }] = await Promise.all([
    sb.from('host_pedidos').select('id, status, motivo, cidade, experiencia, detalhe_experiencia, disponibilidade, contato, resposta_admin, criado_em, decidido_em, perfis!host_pedidos_usuario_id_fkey(id, nome, email, cidade)').eq('status', status).order('criado_em', { ascending: status !== 'pendente' ? false : true }).limit(100),
    sb.from('host_pedidos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
  ]);
  return (<>
    <h1 style={{ fontSize: 30 }}>Pedidos para ser host</h1>
    <p style={{ color: 'var(--suave)' }}>Participantes que pediram para virar host. Ao aprovar, a pessoa passa a ter o papel de host; depois defina a região, as permissões e os eventos dela no perfil de administração.</p>
    <Aviso erro={error} />
    <div className="j-acoes" style={{ justifyContent: 'flex-start' }}>
      {Object.entries(ROT).map(([v, t]) => <Link key={v} className={`btn mini ${status === v ? 'p' : 'o'}`} href={`/admin/pedidos-host?status=${v}`}>{t}{v === 'pendente' ? ` (${count || 0})` : ''}</Link>)}
    </div>
    {(data || []).length === 0 && !error && <div className="card vazio">Nenhum pedido {ROT[status].toLowerCase().replace(/s$/, '')}.</div>}
    {(data || []).map((p) => (
      <section className="card" key={p.id}>
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <b>{p.perfis?.nome || 'Pessoa'}</b>
          <span className={`tag ${p.status === 'aprovado' ? 'ok' : ''}`}>{ROT[p.status].replace(/s$/, '')}</span>
        </div>
        <small style={{ display: 'block', color: 'var(--suave)' }}>{p.perfis?.email} · pedido em {dataHora(p.criado_em)}</small>
        <dl className="hp-resp">
          <dt>Por que quer ser host</dt><dd style={{ whiteSpace: 'pre-line' }}>{p.motivo}</dd>
          <dt>Cidade onde ajudaria</dt><dd>{p.cidade}</dd>
          <dt>Já organizou encontros ou grupos?</dt><dd>{p.experiencia === 'sim' ? `Sim${p.detalhe_experiencia ? ` — ${p.detalhe_experiencia}` : ''}` : 'Não'}</dd>
          <dt>Disponibilidade</dt><dd>{DISP[p.disponibilidade]}</dd>
          {p.contato && <><dt>WhatsApp</dt><dd>{p.contato}</dd></>}
        </dl>
        <p><Link className="btn o mini" href={`/admin/usuarios/${p.perfis?.id}`}>Ver perfil de administração</Link></p>
        {p.status === 'pendente'
          ? <DecidirHost id={p.id} />
          : <p style={{ color: 'var(--suave)' }}>Decidido em {dataHora(p.decidido_em)}{p.resposta_admin ? ` · Recado: “${p.resposta_admin}”` : ''}</p>}
      </section>
    ))}
  </>);
}
