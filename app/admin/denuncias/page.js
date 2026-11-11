import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import DenunciaCard from '@/components/admin/DenunciaCard';
export const dynamic = 'force-dynamic';
const abas = [['aberta', 'Abertas'], ['em_analise', 'Em análise'], ['resolvida', 'Resolvidas']];
export default async function Denuncias({ searchParams }) {
  const sp = await searchParams;
  const status = abas.some(a => a[0] === sp?.status) ? sp.status : 'aberta';
  const sb = await criarServidor();
  const { data } = await sb.from('denuncias')
    .select('id, motivo, status, providencias, criado_em, mensagem_id, mensagem_texto, autor:perfis!denuncias_autor_id_fkey(nome), denunciado:perfis!denuncias_denunciado_id_fkey(id, nome, bloqueado)')
    .eq('status', status).order('criado_em', { ascending: false });
  return (<>
    <h1 style={{ fontSize: 30 }}>Denúncias</h1>
    <div className="linha" style={{ justifyContent: 'flex-start' }}>
      {abas.map(([v, t]) => <Link key={v} href={`/admin/denuncias?status=${v}`} className={`btn mini ${status === v ? 'p' : 'o'}`}>{t}</Link>)}
    </div>
    {(!data || !data.length) && <div className="card vazio"><h3>Nenhuma denúncia nesta lista</h3></div>}
    {(data || []).map(d => <DenunciaCard key={d.id} d={d} />)}
  </>);
}
