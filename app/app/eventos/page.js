import { criarServidor } from '@/lib/supabase/server';
import EventosLista from '@/components/EventosLista';
import SubAbas from '@/components/SubAbas';
import { favoritosDe } from '@/lib/favoritos';
export const dynamic = 'force-dynamic';
const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

const ABAS = [['/app/eventos', 'Todos'], ['/app/eventos?aba=hoje', 'Hoje'], ['/app/eventos?aba=minhas', 'Meus'], ['/app/eventos?aba=passados', 'Realizados']];
const SUBTITULO = { hoje: 'Encontros de hoje', proximos: 'Próximos encontros', minhas: 'Encontros em que você confirmou presença', passados: 'Encontros que já aconteceram' };
const VAZIO = {
  hoje: { titulo: 'Nada marcado para hoje', texto: 'Veja os próximos encontros na aba “Todos”.' },
  proximos: { titulo: 'Nenhum encontro marcado ainda', texto: 'Assim que um novo encontro for publicado, ele aparece aqui.' },
  minhas: { titulo: 'Você ainda não confirmou presença', texto: 'Abra um encontro em “Próximos” e confirme para ele aparecer aqui.' },
  passados: { titulo: 'Nenhum encontro realizado ainda', texto: 'Os encontros que já aconteceram ficam guardados aqui.' }
};

export default async function Eventos({ searchParams }) {
  const sp = await searchParams;
  const aba = ['hoje', 'minhas', 'passados'].includes(sp?.aba) ? sp.aba : 'proximos';
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const agora = new Date().toISOString();
  let consulta = sb.from('eventos').select('id, nome, inicio, banner_url, capacidade, estabelecimentos(nome, logo_url)');
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  consulta = aba === 'passados' ? consulta.lt('inicio', agora).order('inicio', { ascending: false }).limit(30)
    : aba === 'hoje' ? consulta.gte('inicio', new Date(`${hoje}T00:00:00-03:00`).toISOString()).lt('inicio', new Date(`${hoje}T23:59:59-03:00`).toISOString()).order('inicio')
    : consulta.gte('inicio', agora).order('inicio');
  const { data: eventos } = await consulta;
  const { data: minhas } = await sb.from('confirmacoes').select('evento_id').eq('usuario_id', user.id).in('status', ['confirmado', 'presente']);
  const meus = new Set((minhas || []).map(c => c.evento_id));
  const favs = await favoritosDe(sb, user.id, 'evento');
  const base = (eventos || []).filter(e => aba !== 'minhas' || meus.has(e.id));
  const totais = await Promise.all(base.map(async e => (await sb.rpc('total_confirmados', { ev: e.id })).data || 0));
  const itens = base.map((e, i) => ({
    id: e.id, nome: e.nome, quando: quando(e.inicio), hora: new Date(e.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace(':', 'h'), banner_url: e.banner_url, capacidade: e.capacidade,
    local: e.estabelecimentos?.nome || 'Local a definir', logo_url: e.estabelecimentos?.logo_url || null,
    total: totais[i], confirmado: meus.has(e.id), favorito: favs.has(String(e.id)),
    dia: new Date(e.inicio).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' }),
    mes: new Date(e.inicio).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')
  }));
  return (<div className="pag-larga">
    <h1 style={{ fontSize: 30 }}>Eventos</h1>
    <SubAbas itens={ABAS} ativo={aba === 'proximos' ? '/app/eventos' : `/app/eventos?aba=${aba}`} rotulo="Encontros" chips />
    <p style={{ color: 'var(--suave)', margin: '0 0 4px' }}>{SUBTITULO[aba]}</p>
    <EventosLista key={aba} eventos={itens} vazio={VAZIO[aba]} inicial={typeof sp?.q === 'string' ? sp.q : ''} />
  </div>);
}
