import { criarServidor } from '@/lib/supabase/server';
import EventosLista from '@/components/EventosLista';
export const dynamic = 'force-dynamic';
const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export default async function Eventos() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('nome').eq('id', user.id).single();
  const { data: eventos } = await sb.from('eventos')
    .select('id, nome, inicio, banner_url, capacidade, estabelecimentos(nome, logo_url)')
    .gte('inicio', new Date().toISOString()).order('inicio');
  const { data: minhas } = await sb.from('confirmacoes').select('evento_id').eq('usuario_id', user.id).in('status', ['confirmado', 'presente']);
  const meus = new Set((minhas || []).map(c => c.evento_id));
  const totais = await Promise.all((eventos || []).map(async e => (await sb.rpc('total_confirmados', { ev: e.id })).data || 0));
  const itens = (eventos || []).map((e, i) => ({
    id: e.id, nome: e.nome, quando: quando(e.inicio), banner_url: e.banner_url, capacidade: e.capacidade,
    local: e.estabelecimentos?.nome || 'Local a definir', logo_url: e.estabelecimentos?.logo_url || null,
    total: totais[i], confirmado: meus.has(e.id)
  }));
  return (<>
    <h1 style={{ fontSize: 32 }}>Oi, {perfil?.nome?.split(' ')[0]}!</h1>
    <p style={{ color: 'var(--suave)' }}>Próximos encontros</p>
    <EventosLista eventos={itens} />
  </>);
}
