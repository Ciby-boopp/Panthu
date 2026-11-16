import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import ConvidarAmigos from '@/components/ConvidarAmigos';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Convidar amigos' };
export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p, error } = await sb.from('perfis').select('codigo_indicacao').eq('id', user.id).single();
  const { data: lista } = await sb.rpc('minhas_indicacoes');
  return (<>
    <p><Link href="/app/perfil">← Perfil</Link></p>
    <h1 style={{ fontSize: 32 }}>Convidar amigos</h1>
    <p style={{ color: 'var(--suave)' }}>Chame pessoas para o Panthu por link ou código.</p>
    {error || !p?.codigo_indicacao ? <p className="msg erro">Indicação indisponível. Rode o arquivo supabase/pontos-favoritos-lgpd.sql no Supabase.</p> : <ConvidarAmigos codigo={p.codigo_indicacao} lista={lista || []} />}
  </>);
}
