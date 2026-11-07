import Topo from '@/components/Topo';
import { criarServidor } from '@/lib/supabase/server';
export default async function Layout({ children }) {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel').eq('id', user.id).single();
  return (<><Topo papel={p?.papel} /><main>{children}</main></>);
}
