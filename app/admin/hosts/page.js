import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hosts' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['hosts', 'regional'], 'hosts');
  const sb = await criarServidor();
  const { data, error } = await sb.rpc('adm_hosts');
  const hosts = data || [];
  const porRegiao = hosts.reduce((m, h) => { const k = h.regiao || 'Sem região definida'; (m[k] ||= []).push(h); return m; }, {});
  return (<>
    <h1 style={{ fontSize: 30 }}>Hosts</h1>
    <AdmAbas base="/admin/hosts" itens={[['hosts', 'Hosts'], ['regional', 'Gestão regional']]} ativo={aba} />
    <Aviso erro={error} />
    {aba === 'hosts' ? (
      <section className="card">
        {hosts.length === 0 ? <p className="vazio">Nenhum host cadastrado. Defina o papel de uma pessoa em Usuários.</p> : hosts.map((h) => (
          <div className="item" key={h.id}>
            <span><Link href={`/admin/usuarios/${h.id}`}><b>{h.nome}</b></Link><small>{h.regiao || 'Sem região'}</small></span>
            <span style={{ textAlign: 'right' }}><span className="tag">{h.eventos} evento(s)</span><span className="tag">{h.confirmados} confirmados</span>{h.nota && <span className="tag ok">★ {h.nota}</span>}</span>
          </div>
        ))}
      </section>
    ) : Object.entries(porRegiao).map(([r, hs]) => (
      <section className="card" key={r}><h3>{r}</h3><p style={{ color: 'var(--suave)', marginTop: 0 }}>{hs.length} host(s) · {hs.reduce((a, h) => a + Number(h.eventos), 0)} evento(s)</p>
        {hs.map((h) => <div className="item" key={h.id}><Link href={`/admin/usuarios/${h.id}`}>{h.nome}</Link><span>{h.eventos} evento(s){h.nota ? ` · ★ ${h.nota}` : ''}</span></div>)}
      </section>
    ))}
  </>);
}
