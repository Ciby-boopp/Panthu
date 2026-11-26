import Topo from '@/components/Topo';
import BotaoVoltar from '@/components/BotaoVoltar';
import ManualAdmin from '@/components/admin/ManualAdmin';
import { MANUAL_HOST } from '@/lib/manualHost';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manual do Host' };
export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel').eq('id', user.id).single();
  return (<><Topo papel={p?.papel} /><main>
    <p><BotaoVoltar href="/host" className="btn o mini">← Voltar</BotaoVoltar></p>
    <h1 style={{ fontSize: 30 }}>Manual do Host</h1>
    <p style={{ color: 'var(--suave)' }}>Tudo o que você pode fazer como host. Toque em uma pergunta para ver o passo a passo, ou use a busca.</p>
    <ManualAdmin manual={MANUAL_HOST} />
  </main></>);
}
