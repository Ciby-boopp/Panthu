'use client';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import Icone from './Icone';
export default function Sair({ aba = false }) {
  const router = useRouter();
  async function sair() { await criarCliente().auth.signOut(); router.replace('/entrar'); router.refresh(); }
  if (aba) return <button type="button" className="aba" style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={sair}><Icone nome="sair" />Sair</button>;
  return <button type="button" className="btn o mini" onClick={sair}><Icone nome="sair" />Sair</button>;
}
