import Topo from '@/components/Topo';
import ErroReporter from '@/components/ErroReporter';
import { criarServidor } from '@/lib/supabase/server';
export default async function Layout({ children }) {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel').eq('id', user.id).single();
  const { data: av } = await sb.from('adm_config').select('valor').eq('chave', 'aviso_geral').maybeSingle();
  const aviso = (av?.valor || '').trim();
  return (<><ErroReporter /><Topo papel={p?.papel} />{aviso && <div className="aviso-geral" role="status">📢 {aviso}</div>}<main id="conteudo" tabIndex={-1}>{children}</main></>);
}
