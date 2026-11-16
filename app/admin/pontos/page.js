import { criarServidor } from '@/lib/supabase/server';
import PontosAdmin from '@/components/PontosAdmin';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pontos e brindes' };
export default async function Page() {
  const sb = await criarServidor();
  const [{ data: regras, error }, { data: brindes }, { data: cupons }] = await Promise.all([
    sb.from('pontos_regras').select('*').order('ordem'),
    sb.from('pontos_brindes').select('*').order('meta'),
    sb.from('pontos_cupons').select('id, codigo, status, criado_em, perfis!pontos_cupons_usuario_id_fkey(nome)').order('criado_em', { ascending: false }).limit(20),
  ]);
  return (<>
    <h1 style={{ fontSize: 32 }}>Pontos e brindes</h1>
    <p style={{ color: 'var(--suave)' }}>Defina quantos pontos cada ação vale e qual brinde é liberado ao atingir a meta.</p>
    {error ? <p className="msg erro">Rode o arquivo supabase/pontos-favoritos-lgpd.sql no Supabase.</p> : <PontosAdmin regras={regras || []} brindes={brindes || []} />}
    <section className="card"><h3>Últimos cupons liberados</h3>
      {(cupons || []).length === 0 ? <p className="vazio" style={{ padding: 16 }}>Nenhum cupom ainda.</p> : cupons.map((c) => (
        <div className="item" key={c.id}><span>{c.perfis?.nome || 'Pessoa'}<small>{c.codigo}</small></span><span className={`tag ${c.status === 'disponivel' ? 'ok' : ''}`}>{c.status}</span></div>
      ))}
    </section>
  </>);
}
