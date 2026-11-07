import { redirect } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
export default async function Inicio() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  redirect(user ? '/app' : '/entrar');
}
