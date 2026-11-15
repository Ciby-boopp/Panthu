'use client';
import { usePathname } from 'next/navigation';
import ConversaLista from './ConversaLista';

// Duas colunas no computador (lista + conversa). No celular mostra uma de cada vez:
// em /app/chat aparece a lista; em /app/chat/[id] aparece a conversa.
export default function ChatShell({ children }) {
  const path = usePathname() || '';
  const salaId = path.match(/^\/app\/chat\/([^/]+)/)?.[1] || null;
  return (
    <div className="chat-shell" data-sala={salaId ? 'sim' : 'nao'}>
      <aside className="chat-lista" aria-label="Conversas"><ConversaLista ativo={salaId} /></aside>
      <section className="chat-painel">{children}</section>
    </div>
  );
}
