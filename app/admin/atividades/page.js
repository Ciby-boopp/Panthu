import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
import { NOMES_JOGO, dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Encontros e atividades' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['encontros', 'mesas', 'jogos'], 'encontros');
  const sb = await criarServidor();
  let conteudo;
  if (aba === 'encontros') {
    const { data: ev } = await sb.from('eventos').select('id, nome, inicio, capacidade').order('inicio', { ascending: false }).limit(30);
    const { data: conf } = await sb.from('confirmacoes').select('evento_id, status').in('evento_id', (ev || []).map((e) => e.id));
    const cont = {};
    (conf || []).forEach((c) => { const o = (cont[c.evento_id] ||= { conf: 0, pres: 0 }); if (c.status === 'confirmado' || c.status === 'presente') o.conf++; if (c.status === 'presente') o.pres++; });
    conteudo = (<section className="card"><div className="linha"><h3>Encontros e atividades</h3><Link className="btn p mini" href="/admin/eventos/novo">+ Novo evento</Link></div>
      {(ev || []).map((e) => { const c = cont[e.id] || { conf: 0, pres: 0 }; return (
        <div className="item" key={e.id}><span><Link href={`/admin/eventos/${e.id}`}><b>{e.nome}</b></Link><small>{dataHora(e.inicio)}</small></span>
          <span><span className="tag ok">{c.conf}{e.capacidade ? `/${e.capacidade}` : ''} confirmados</span><span className="tag">{c.pres} presentes</span></span></div>); })}
    </section>);
  } else if (aba === 'mesas') {
    const { data: mesas } = await sb.from('mesas').select('id, nome, lugares, evento_id, eventos(nome, inicio)').order('evento_id').limit(200);
    const porEvento = (mesas || []).reduce((m, x) => { const k = x.eventos?.nome || 'Evento'; (m[k] ||= []).push(x); return m; }, {});
    conteudo = Object.keys(porEvento).length === 0 ? <div className="card vazio">Nenhuma mesa criada. O host cria as mesas dentro do evento.</div> : Object.entries(porEvento).map(([n, ms]) => (
      <section className="card" key={n}><h3>{n}</h3><p style={{ color: 'var(--suave)', marginTop: 0 }}>{ms.length} mesa(s) · {ms.reduce((a, m) => a + (m.lugares || 0), 0)} lugares</p>
        <div>{ms.map((m) => <span className="tag" key={m.id}>{m.nome} · {m.lugares || '?'} lugares</span>)}</div></section>));
  } else {
    const { data, error } = await sb.rpc('adm_jogos_stats');
    conteudo = (<>
      <Aviso erro={error} />
      <section className="card"><h3>Jogos</h3>
        {(data || []).length === 0 ? <p className="vazio">Ninguém jogou ainda.</p> : data.map((j) => (
          <div className="item" key={j.jogo}><span><b>{NOMES_JOGO[j.jogo] || j.jogo}</b><small>{j.jogadores} jogador(es) · {j.online} partida(s) online</small></span>
            <span><span className="tag">{j.partidas} partidas</span><span className="tag ok">{j.partidas_7d} em 7 dias</span>{j.jogando_agora > 0 && <span className="tag ok">🔥 {j.jogando_agora} agora</span>}</span></div>
        ))}
      </section></>);
  }
  return (<>
    <h1 style={{ fontSize: 30 }}>Encontros e atividades</h1>
    <AdmAbas base="/admin/atividades" itens={[['encontros', 'Encontros e atividades'], ['mesas', 'Mesas e participantes'], ['jogos', 'Jogos'], ['/admin/eventos', 'Gerenciar eventos']]} ativo={aba} />
    {conteudo}
  </>);
}
