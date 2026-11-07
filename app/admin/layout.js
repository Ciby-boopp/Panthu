import Link from 'next/link';
import Topo from '@/components/Topo';
import './admin.css';
export default function AdminLayout({ children }) {
  return (<><Topo papel="admin" /><main>
    <nav className="subnav">
      <Link href="/admin">Painel</Link>
      <Link href="/admin/eventos">Eventos</Link>
      <Link href="/admin/estabelecimentos">Estabelecimentos</Link>
    </nav>
    {children}
  </main></>);
}
