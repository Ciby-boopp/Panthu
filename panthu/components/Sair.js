'use client';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function Sair() {
  const router = useRouter();
  async function sair() { await criarCliente().auth.signOut(); router.replace('/entrar'); router.refresh(); }
  return <button className="btn o" style={{ minHeight: 36, padding: '6px 16px' }} onClick={sair}>Sair</button>;
}
