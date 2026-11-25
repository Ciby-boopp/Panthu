import Topo from '@/components/Topo';
import ValidarCupom from '@/components/ValidarCupom';
import { criarServidor } from '@/lib/supabase/server';
import BotaoVoltar from '@/components/BotaoVoltar';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cupons de brinde' };
export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('papel').eq('id', user.id).single();
  return (<><Topo papel={p?.papel} /><main className="estreito">
    <p><BotaoVoltar href="/host">← Voltar</BotaoVoltar></p>
    <h1 style={{ fontSize: 32 }}>Cupons de brinde</h1>
    <p style={{ color: 'var(--suave)' }}>Quando uma pessoa chega à meta de pontos, ela recebe um cupom. Peça o código, confira e entregue o brinde.</p>
    <ValidarCupom />
  </main></>);
}
