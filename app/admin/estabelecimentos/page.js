import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Lista() {
  const sb = await criarServidor();
  const { data } = await sb.from('estabelecimentos').select('id, nome, endereco, logo_url, ativo').order('nome');
  return (<>
    <div className="linha"><h1 style={{ fontSize: 30 }}>Estabelecimentos</h1><Link className="btn p" href="/admin/estabelecimentos/novo">+ Novo</Link></div>
    {(!data || !data.length) && <div className="card vazio"><h3>Nenhum estabelecimento ainda</h3><p>Cadastre o primeiro local parceiro.</p></div>}
    {(data || []).map(e => (
      <Link key={e.id} href={`/admin/estabelecimentos/${e.id}`} className="card lista-item">
        <div className="logo-local">{e.logo_url ? <img src={e.logo_url} alt="" /> : 'logo'}</div>
        <div><b>{e.nome}</b>{!e.ativo && <span className="tag" style={{ marginLeft: 8 }}>inativo</span>}<br /><small style={{ color: 'var(--suave)' }}>{e.endereco}</small></div>
      </Link>
    ))}
  </>);
}
