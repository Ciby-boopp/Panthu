'use client';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import Icone from './Icone';
export default function Sair({ aba = false }) {
  const router = useRouter();
  async function sair() {
    const sb = criarCliente();
    // Para de receber notificações deste aparelho em nome de quem saiu.
    try {
      const reg = await navigator.serviceWorker?.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await sb.from('push_inscricoes').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
    } catch {}
    await sb.auth.signOut(); router.replace('/entrar'); router.refresh(); }
  if (aba) return <button type="button" className="aba" style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={sair}><Icone nome="sair" />Sair</button>;
  return <button type="button" className="btn o mini" onClick={sair}><Icone nome="sair" />Sair</button>;
}
