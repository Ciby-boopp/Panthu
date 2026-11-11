'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function AtualizarSozinho({ segundos = 20 }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) router.refresh(); }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
