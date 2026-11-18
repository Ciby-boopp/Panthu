'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Atualiza a tela de tempos em tempos só enquanto ela está visível, e ao voltar para ela.
export default function AtualizarSozinho({ segundos = 20 }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) router.refresh(); }, segundos * 1000);
    const v = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [router, segundos]);
  return null;
}
