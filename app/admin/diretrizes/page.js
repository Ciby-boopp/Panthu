import { criarServidor } from '@/lib/supabase/server';
import DiretrizesEditor from '@/components/admin/DiretrizesEditor';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diretrizes da comunidade' };
export default async function Page() {
  const sb = await criarServidor();
  const { data, error } = await sb.from('diretrizes').select('id, slug, titulo, conteudo, ordem, visivel, padrao, atualizado_em').order('ordem');
  return (<>
    <h1 style={{ fontSize: 30 }}>Diretrizes da comunidade</h1>
    <p style={{ color: 'var(--suave)' }}>Edite o texto de cada seção. O que você salvar aparece na página pública “Diretrizes da comunidade”, que todos podem ler.</p>
    {error ? <p className="msg erro">Rode o arquivo <b>supabase/diretrizes.sql</b> no Supabase (SQL Editor) e recarregue.</p> : <DiretrizesEditor inicial={data || []} />}
  </>);
}
