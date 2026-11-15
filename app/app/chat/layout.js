import ChatShell from '@/components/chat/ChatShell';
import '@/components/chat.css';
export default function ChatLayout({ children }) {
  return <ChatShell>{children}</ChatShell>;
}
