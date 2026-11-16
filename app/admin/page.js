import Link from 'next/link';
import Icone from '@/components/Icone';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

const num = (n) => Number(n || 0).toLocaleString('pt-BR');
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nomeMes = (ym) => MES[Number(ym.slice(5, 7)) - 1];

function Cartao({ titulo, valor, icone, href, nota }) {
  const corpo = (<><div className="ico-c"><Icone nome={icone} /></div><div className="num">{valor}</div><span>{titulo}</span>{nota && <small>{nota}</small>}</>);
  return <div className="stat">{href ? <Link href={href} style={{ display: 'grid', gap: 10 }}>{corpo}</Link> : corpo}</div>;
}

export default async function Admin() {
  const sb = await criarServidor();
  const { data: r, error } = await sb.rpc('adm_resumo');
  if (error || !r) {
    return (<>
      <h1 style={{ fontSize: 32 }}>Painel ADM</h1>
      <div className="card"><h3>Indicadores indisponíveis</h3>
        <p>Não foi possível carregar os números. Rode o arquivo <b>supabase/adm-fase1.sql</b> no SQL Editor do Supabase e recarregue esta página.</p>
        <small style={{ color: 'var(--suave)' }}>Detalhe técnico: {error?.message || 'sem resposta'}</small></div>
    </>);
  }
  const cres = r.crescimento || [];
  const maxN = Math.max(1, ...cres.map(c => c.novos));
  const atual = cres.length ? cres[cres.length - 1].novos : 0;
  const anterior = cres.length > 1 ? cres[cres.length - 2].novos : 0;
  const variacao = anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : null;
  const saldo = Number(r.receitas) - Number(r.despesas);
  const saldoMes = Number(r.receitas_mes) - Number(r.despesas_mes);

  return (<>
    <header className="adm-topo"><span className="adm-selo">ADM</span><h1>Painel Administrativo</h1><p>Gerencie tudo em um só lugar</p></header>
    <nav className="adm-tiles" aria-label="Atalhos do painel">
      {[['/admin/conexoes', 'Conexões', 'usuarios'], ['/admin/usuarios', 'Usuários', 'perfil'], ['/admin/eventos', 'Eventos', 'eventos'], ['/admin/estabelecimentos', 'Estabelecimentos', 'local'], ['/admin/avaliacoes', 'Avaliações', 'check'], ['/admin/denuncias', 'Denúncias', 'alerta'], ['/admin/auditoria', 'Auditoria', 'busca'], ['/admin/pontos', 'Pontos e brindes', 'jogos']].map(([h, n, ic]) => <Link key={h} href={h} className="adm-tile"><Icone nome={ic} />{n}</Link>)}
    </nav>
    <div className="linha" style={{ justifyContent: 'flex-start' }}>
      <Link className="btn p" href="/admin/eventos/novo">+ Novo evento</Link>
      <Link className="btn s" href="/admin/estabelecimentos/novo">+ Novo estabelecimento</Link>
    </div>

    <h2 className="adm-sec">Usuários</h2>
    <div className="stats">
      <Cartao titulo="Cadastrados" valor={num(r.usuarios_total)} icone="usuarios" href="/admin/usuarios" />
      <Cartao titulo="Online agora" valor={num(r.online_agora)} icone="perfil" href="/admin/conexoes" nota="últimos 5 min" />
      <Cartao titulo="Ativos" valor={num(r.usuarios_ativos)} icone="check" />
      <Cartao titulo="Acessaram em 7 dias" valor={num(r.acessaram_7d)} icone="usuarios" nota="com sessão registrada" />
      <Cartao titulo="Novos em 7 dias" valor={num(r.novos_7d)} icone="perfil" nota={`${num(r.novos_30d)} em 30 dias`} />
      <Cartao titulo="Inativos / bloqueados" valor={`${num(r.usuarios_inativos)} / ${num(r.usuarios_bloqueados)}`} icone="alerta" />
    </div>

    <h2 className="adm-sec">Operação</h2>
    <div className="stats">
      <Cartao titulo="Hosts" valor={num(r.hosts)} icone="host" href="/admin/usuarios?papel=host" />
      <Cartao titulo="Cidades ativas" valor={num(r.cidades_ativas)} icone="local" />
      <Cartao titulo="Eventos" valor={num(r.eventos_total)} icone="eventos" href="/admin/eventos" nota={`${num(r.eventos_futuros)} futuros · ${num(r.eventos_realizados)} realizados`} />
      <Cartao titulo="Confirmações" valor={num(r.confirmados)} icone="check" nota={`${num(r.presentes)} com presença`} />
      <Cartao titulo="Parceiros ativos" valor={num(r.parceiros)} icone="local" href="/admin/estabelecimentos" />
      <Cartao titulo="Cupons ativos" valor={num(r.cupons_ativos)} icone="check" />
      <Cartao titulo="Denúncias abertas" valor={num(r.denuncias_abertas)} icone="alerta" href="/admin/denuncias" />
    </div>

    <h2 className="adm-sec">Financeiro</h2>
    <div className="stats">
      <Cartao titulo="Receitas" valor={brl(r.receitas)} icone="check" nota={`${brl(r.receitas_mes)} neste mês`} />
      <Cartao titulo="Despesas" valor={brl(r.despesas)} icone="alerta" nota={`${brl(r.despesas_mes)} neste mês`} />
      <Cartao titulo="Saldo" valor={brl(saldo)} icone="adm" nota={`${brl(saldoMes)} neste mês`} />
    </div>

    <div className="adm-duas" style={{ marginTop: 18 }}>
      <div className="card">
        <h3>Novos cadastros por mês</h3>
        <p className="vazio-nota">
          {variacao === null ? 'Sem base de comparação com o mês anterior.' :
            <>Este mês vs. anterior: <b className={variacao >= 0 ? 'up' : 'down'}>{variacao >= 0 ? '+' : ''}{variacao}%</b></>}
        </p>
        <div className="barras" role="img" aria-label="Novos cadastros nos últimos 6 meses">
          {cres.map(c => (<div className="barra" key={c.mes}><b>{c.novos}</b><i style={{ height: `${(c.novos / maxN) * 100}%` }} />{nomeMes(c.mes)}</div>))}
        </div>
      </div>
      <div className="card">
        <h3>Usuários por cidade</h3>
        {(r.por_cidade || []).filter(c => c.usuarios > 0).length === 0 && <p className="vazio-nota">Nenhum usuário vinculado a uma cidade ainda.</p>}
        {(r.por_cidade || []).filter(c => c.usuarios > 0).map(c => (
          <div className="linha-rank" key={c.cidade + c.estado}><span>{c.cidade}{c.estado ? ` - ${c.estado}` : ''}</span><b>{num(c.usuarios)}</b></div>
        ))}
        {r.sem_cidade > 0 && <p className="vazio-nota">{num(r.sem_cidade)} usuário(s) sem cidade definida.</p>}
      </div>
    </div>
    <p className="vazio-nota" style={{ marginTop: 18 }}>
      Todos os números vêm direto do banco. “Online” e “acessaram” contam a partir de quando o registro de sessões foi ativado; antes disso aparecem zerados.
    </p>
  </>);
}
