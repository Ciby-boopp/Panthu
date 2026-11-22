import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import BuscarPessoas from '@/components/BuscarPessoas';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Encontrar pessoas' };

export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: cidades, error } = await sb.rpc('cidades_com_pessoas');
  return (<div className="pag-larga">
    <p><Link href="/app">← Início</Link></p>
    <h1 style={{ fontSize: 30 }}>Encontrar pessoas</h1>
    <p style={{ color: 'var(--suave)' }}>Escolha a cidade, digite o nome e veja quem é. Abra o perfil ou toque em Salvar para guardar como amigo.</p>
    {error ? <p className="msg erro">A busca ainda não está disponível. Avise a equipe do Panthu.</p> : <BuscarPessoas cidades={cidades || []} euId={user.id} />}
  </div>);
}
