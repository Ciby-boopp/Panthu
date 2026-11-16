import { criarServidor } from '@/lib/supabase/server';
import BoasVindas from '@/components/BoasVindas';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Boas-vindas' };
export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('id, cidade, interesses, hobbies, procura, regras_aceitas_em, privacidade_aceita_em').eq('id', user.id).single();
  return <div className="estreito"><BoasVindas perfil={perfil || { id: user.id }} /></div>;
}
