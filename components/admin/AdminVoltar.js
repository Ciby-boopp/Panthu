'use client';
import { usePathname } from 'next/navigation';
import BotaoVoltar from '../BotaoVoltar';

// Botão "Voltar" no topo de todas as telas do painel (menos a inicial): volta para onde a pessoa estava.
export default function AdminVoltar() {
  const path = usePathname();
  if (!path || path === '/admin') return null;
  return <p className="adm-voltar"><BotaoVoltar href="/admin" className="btn o mini">← Voltar</BotaoVoltar></p>;
}
