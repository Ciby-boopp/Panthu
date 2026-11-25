'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const CH = 'panthu_nav_n';
export const lerNav = () => { try { return Number(sessionStorage.getItem(CH) || 0); } catch { return 0; } };
const gravarNav = (n) => { try { sessionStorage.setItem(CH, String(n)); } catch {} };

// Conta quantas telas a pessoa já abriu dentro do Panthu nesta visita, para o botão "Voltar" saber se pode
// voltar para a tela anterior (onde ela estava) ou se deve ir para a tela padrão.
export default function RastroNav() {
  const path = usePathname();
  const primeira = useRef(true), pop = useRef(false);
  useEffect(() => { const f = () => { pop.current = true; }; window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    gravarNav(pop.current ? Math.max(0, lerNav() - 1) : lerNav() + 1);
    pop.current = false;
  }, [path]);
  return null;
}
