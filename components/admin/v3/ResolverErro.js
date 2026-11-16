'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
export default function ResolverErro({ ids, rotulo = 'Marcar como resolvido' }) {
  const sb = useRef(null); const router = useRouter();
  return <button className="btn o mini" onClick={async () => { await (sb.current ||= criarCliente()).from('adm_erros').update({ resolvido: true }).in('id', ids); router.refresh(); }}>{rotulo}</button>;
}
