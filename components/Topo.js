import Link from 'next/link';
import Logo from './Logo';
import Sair from './Sair';
export default function Topo({ papel }) {
  return (
    <header className="topo">
      <Link href="/app" className="marca"><Logo />panthu</Link>
      <nav className="nav">
        <Link href="/app">Eventos</Link>
        <Link href="/app/perfil">Perfil</Link>
        {['host', 'admin'].includes(papel) && <Link href="/host">Host</Link>}
        {papel === 'admin' && <Link href="/admin">ADM</Link>}
        <Sair />
      </nav>
    </header>
  );
}
