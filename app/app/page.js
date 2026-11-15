import { criarServidor } from '@/lib/supabase/server';
import EventosLista from '@/components/EventosLista';
import SubAbas from '@/components/SubAbas';
export const dynamic = 'force-dynamic';
const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

const ABAS = [['/app', 'Próximos'], ['/app?aba=minhas', 'Minhas presenças'], ['/app?aba=passados', 'Realizados']];
const SUBTITULO = { proximos: 'Próximos encontros', minhas: 'Encontros em que você confirmou presença', passados: 'Encontros que já aconteceram' };
const VAZIO = {
  proximos: { titulo: 'Nenhum encontro marcado ainda', texto: 'Assim que um novo encontro for publicado, ele aparece aqui.' },
  minhas: { titulo: 'Você ainda não confirmou presença', texto: 'Abra um encontro em “Próximos” e confirme para ele aparecer aqui.' },
  passados: { titulo: 'Nenhum encontro realizado ainda', texto: 'Os encontros que já aconteceram ficam guardados aqui.' }
};

export default async function Eventos({ searchParams }) {
  const sp = await searchParams;
  const aba = ['minhas', 'passados'].includes(sp?.aba) ? sp.aba : 'proximos';
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('nome').eq('id', user.id).single();
  const agora = new Date().toISOString();
  let consulta = sb.from('eventos').select('id, nome, inicio, banner_url, capacidade, estabelecimentos(nome, logo_url)');
  consulta = aba === 'passados' ? consulta.lt('inicio', agora).order('inicio', { ascending: false }).limit(30) : consulta.gte('inicio', agora).order('inicio');
  const { data: eventos } = await consulta;
  const { data: minhas } = await sb.from('confirmacoes').select('evento_id').eq('usuario_id', user.id).in('status', ['confirmado', 'presente']);
  const meus = new Set((minhas || []).map(c => c.evento_id));
  const base = (eventos || []).filter(e => aba !== 'minhas' || meus.has(e.id));
  const totais = await Promise.all(base.map(async e => (await sb.rpc('total_confirmados', { ev: e.id })).data || 0));
  const itens = base.map((e, i) => ({
    id: e.id, nome: e.nome, quando: quando(e.inicio), banner_url: e.banner_url, capacidade: e.capacidade,
    local: e.estabelecimentos?.nome || 'Local a definir', logo_url: e.estabelecimentos?.logo_url || null,
    total: totais[i], confirmado: meus.has(e.id)
  }));
  return (<div className="pag-larga">
    <h1 style={{ fontSize: 32 }}>Oi, {perfil?.nome?.split(' ')[0]}!</h1>
    <SubAbas itens={ABAS} ativo={aba === 'proximos' ? '/app' : `/app?aba=${aba}`} rotulo="Encontros" />
    <p style={{ color: 'var(--suave)', margin: '0 0 4px' }}>{SUBTITULO[aba]}</p>
    <EventosLista key={aba} eventos={itens} vazio={VAZIO[aba]} />
  </div>);
}
