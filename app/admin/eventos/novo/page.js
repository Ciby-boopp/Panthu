import { criarServidor } from '@/lib/supabase/server';
import EventoForm from '@/components/admin/EventoForm';
export const dynamic = 'force-dynamic';
export default async function Novo() {
  const sb = await criarServidor();
  const { data: locais } = await sb.from('estabelecimentos').select('id, nome').eq('ativo', true).order('nome');
  return (<><h1 style={{ fontSize: 30 }}>Novo evento</h1><EventoForm inicial={null} locais={locais || []} /></>);
}
