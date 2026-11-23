import { notFound } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
import SalaTema from '@/components/chat/SalaTema';
export const dynamic = 'force-dynamic';

export default async function TemaPage({ params }) {
  const { slug } = await params;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: lista } = await sb.rpc('grupos_lista');
  const g = (lista || []).find((x) => x.slug === slug);
  if (!g) notFound();
  return <SalaTema grupo={{ id: g.id, nome: g.nome, descricao: g.descricao, emoji: g.emoji, podeExcluir: !!g.pode_excluir }} usuarioId={user.id} participaInicial={g.participo} membrosInicial={Number(g.membros)} />;
}
