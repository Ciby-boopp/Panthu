import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import Impostor from '@/components/impostor/Impostor';
export const metadata = { title: 'Quem é o Impostor?' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }) {
  const { sala } = await searchParams;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from('perfis').select('nome').eq('id', user.id).maybeSingle();
  return (<>
    <p><Link href="/app/jogos" className="btn o mini">← Jogos</Link></p>
    <Impostor euId={user.id} euNome={p?.nome || ''} salaInicial={typeof sala === 'string' ? sala.toUpperCase().slice(0, 8) : null} />
  </>);
}
