import { notFound } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
import EstabForm from '@/components/admin/EstabForm';
import Cardapio from '@/components/admin/Cardapio';
export const dynamic = 'force-dynamic';
export default async function Editar({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: est } = await sb.from('estabelecimentos').select('*').eq('id', id).single();
  if (!est) notFound();
  const { data: cats } = await sb.from('cardapio_categorias')
    .select('id, nome, ordem, cardapio_itens(id, nome, descricao, preco, beneficio_panthu, disponivel)')
    .eq('estabelecimento_id', id).order('ordem');
  return (<><h1 style={{ fontSize: 30 }}>{est.nome}</h1><EstabForm inicial={est} /><Cardapio estabId={id} categorias={cats || []} /></>);
}
