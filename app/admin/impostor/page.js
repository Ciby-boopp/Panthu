import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { abaDe } from '@/components/admin/AdmAbas';
import ImpostorAdmin from '@/components/admin/ImpostorAdmin';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quem é o Impostor?' };

export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['palavras', 'partidas', 'estatisticas', 'denuncias'], 'palavras');
  const sb = await criarServidor();
  const abas = [['palavras', 'Categorias e palavras'], ['partidas', 'Partidas'], ['estatisticas', 'Estatísticas'], ['denuncias', 'Denúncias']];
  let conteudo;
  if (aba === 'palavras') {
    const [{ data: cats, error }, { data: pals }] = await Promise.all([
      sb.from('imp_categorias').select('id, nome, ativa').order('ordem').order('nome'),
      sb.from('imp_palavras').select('id, categoria_id, palavra, ativa').order('palavra').limit(2000),
    ]);
    conteudo = error
      ? <p className="msg erro">Não consegui carregar. Rode o arquivo <b>supabase/impostor.sql</b> no Supabase. ({error.message})</p>
      : <ImpostorAdmin categorias={cats || []} palavras={pals || []} />;
  } else if (aba === 'partidas') {
    const { data: ativas } = await sb.from('imp_salas').select('id, codigo, nome, publica, estado, rodada, criado_em, imp_jogadores(count)').neq('estado', 'fim').order('criado_em', { ascending: false }).limit(50);
    const { count: total } = await sb.from('imp_salas').select('id', { count: 'exact', head: true }).eq('pontuada', true).neq('vencedor', 'cancelada');
    conteudo = (<>
      <section className="card"><h3>Em andamento agora ({(ativas || []).length})</h3>
        {(ativas || []).length === 0 ? <p className="vazio">Nenhuma sala aberta.</p> : (ativas || []).map((s) => (
          <div className="item" key={s.id}><span><b>{s.nome}</b><small>{s.codigo} · {s.publica ? 'pública' : 'privada'} · {dataHora(s.criado_em)}</small></span>
            <span><span className="tag">{s.estado}</span><span className="tag ok">{s.imp_jogadores?.[0]?.count ?? 0} jogadores</span></span></div>))}
      </section>
      <section className="card"><h3>Partidas concluídas</h3><p style={{ fontSize: 30, margin: 0 }}><b>{total ?? 0}</b></p></section>
    </>);
  } else if (aba === 'estatisticas') {
    const desde = new Date(Date.now() - 86400000).toISOString();
    const [{ data: top }, { count: dia }, { count: jogadores }] = await Promise.all([
      sb.from('imp_stats').select('usuario_id, partidas, pontos, vit_impostor, vit_comum, perfis(nome)').order('partidas', { ascending: false }).limit(10),
      sb.from('imp_historico').select('id', { count: 'exact', head: true }).gte('criado_em', desde),
      sb.from('imp_stats').select('usuario_id', { count: 'exact', head: true }),
    ]);
    conteudo = (<>
      <div className="grade-cards">
        <div className="card"><small>Participações nas últimas 24 h</small><p style={{ fontSize: 30, margin: 0 }}><b>{dia ?? 0}</b></p></div>
        <div className="card"><small>Pessoas que já jogaram</small><p style={{ fontSize: 30, margin: 0 }}><b>{jogadores ?? 0}</b></p></div>
      </div>
      <section className="card"><h3>Usuários mais ativos</h3>
        {(top || []).length === 0 ? <p className="vazio">Sem partidas ainda.</p> : (top || []).map((t) => (
          <div className="item" key={t.usuario_id}><span><Link href={`/admin/usuarios?q=${encodeURIComponent(t.perfis?.nome || '')}`}><b>{t.perfis?.nome || 'Usuário'}</b></Link><small>{t.vit_impostor} vitórias como impostor · {t.vit_comum} como comum</small></span>
            <span><span className="tag">{t.partidas} partidas</span><span className="tag ok">{t.pontos} pts</span></span></div>))}
      </section>
    </>);
  } else {
    const { data: den } = await sb.from('imp_denuncias').select('id, codigo, motivo, resolvida, criado_em, denunciante, alvo').order('resolvida').order('id', { ascending: false }).limit(60);
    const ids = [...new Set((den || []).flatMap((d) => [d.alvo, d.denunciante]))];
    const { data: ps } = ids.length ? await sb.from('perfis').select('id, nome').in('id', ids) : { data: [] };
    const N = Object.fromEntries((ps || []).map((p) => [p.id, p.nome]));
    conteudo = <ImpostorAdmin modo="denuncias" denuncias={(den || []).map((d) => ({ ...d, alvoNome: N[d.alvo] || 'Usuário', porNome: N[d.denunciante] || 'Usuário', quando: dataHora(d.criado_em) }))} />;
  }
  return (<>
    <h1>🕵️ Quem é o Impostor?</h1>
    <AdmAbas base="/admin/impostor" itens={abas} ativo={aba} />
    {conteudo}
  </>);
}
