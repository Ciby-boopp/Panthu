import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { abaDe } from '@/components/admin/AdmAbas';
import AlternarAtivo from '@/components/admin/v3/AlternarAtivo';
import { dataBR } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Parcerias e cupons' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['cupons', 'estabelecimentos'], 'cupons');
  const sb = await criarServidor();
  let conteudo;
  if (aba === 'cupons') {
    const { data: cupons } = await sb.from('cupons').select('*').order('validade', { ascending: true, nullsFirst: false }).limit(100);
    conteudo = (<section className="card"><h3>Cupons dos parceiros</h3>
      {(cupons || []).length === 0 ? <p className="vazio">Nenhum cupom cadastrado.</p> : cupons.map((c) => {
        const vencido = c.validade && new Date(c.validade) < new Date(new Date().toDateString());
        return (<div className="item" key={c.id} style={{ alignItems: 'center' }}>
          <span><b>{c.codigo || c.titulo || c.nome || 'Cupom'}</b><small>{c.descricao || c.titulo || ''}{c.validade ? ` · válido até ${dataBR(c.validade)}` : ''}</small></span>
          <span>{vencido && <span className="tag erro">vencido</span>}{'ativo' in c && <AlternarAtivo tabela="cupons" id={c.id} coluna="ativo" inicial={c.ativo !== false} />}</span></div>);
      })}
      <p style={{ color: 'var(--suave)', marginBottom: 0 }}>Os brindes por pontos ficam em <Link href="/admin/pontos">Pontos e brindes</Link>.</p>
    </section>);
  } else {
    const { data: ests } = await sb.from('estabelecimentos').select('id, nome, endereco').order('nome');
    const { data: evs } = await sb.from('eventos').select('estabelecimento_id');
    const cont = {}; (evs || []).forEach((e) => { cont[e.estabelecimento_id] = (cont[e.estabelecimento_id] || 0) + 1; });
    conteudo = (<section className="card"><div className="linha"><h3>Estabelecimentos e benefícios</h3><Link className="btn p mini" href="/admin/estabelecimentos/novo">+ Novo</Link></div>
      {(ests || []).map((e) => <div className="item" key={e.id}><span><Link href={`/admin/estabelecimentos/${e.id}`}><b>{e.nome}</b></Link><small>{e.endereco}</small></span><span className="tag">{cont[e.id] || 0} evento(s)</span></div>)}
    </section>);
  }
  return (<>
    <h1 style={{ fontSize: 30 }}>Parcerias e cupons</h1>
    <AdmAbas base="/admin/parcerias" itens={[['cupons', 'Parcerias e cupons'], ['estabelecimentos', 'Estabelecimentos e benefícios'], ['/admin/pontos', 'Brindes por pontos']]} ativo={aba} />
    {conteudo}
  </>);
}
