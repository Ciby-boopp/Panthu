'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import Sair from './Sair';
import Icone from './Icone';
import useChatAviso from './useChatAviso';

export default function Topo({ papel }) {
  const path = usePathname() || '';
  const { nao, aviso, fechar } = useChatAviso(path);
  const itens = [
    { href: '/app', nome: 'Eventos', icone: 'eventos', ativo: path === '/app' || path.startsWith('/app/evento') },
    { href: '/app/proximo', nome: 'Perto', icone: 'local', ativo: path.startsWith('/app/proximo') || path.startsWith('/app/amigos') },
    { href: '/app/chat', nome: 'Chat', icone: 'chat', ativo: path.startsWith('/app/chat') },
    { href: '/app/perfil', nome: 'Perfil', icone: 'perfil', ativo: path.startsWith('/app/perfil') || path.startsWith('/app/pessoa') },
    ...(['host', 'admin'].includes(papel) ? [{ href: '/host', nome: 'Host', icone: 'host', ativo: path.startsWith('/host') }] : []),
    ...(papel === 'admin' ? [{ href: '/admin', nome: 'ADM', icone: 'adm', ativo: path.startsWith('/admin') }] : []),
  ];
  const aba = (i) => <Link key={i.href} href={i.href} className="aba" aria-current={i.ativo ? 'page' : undefined}><span className="ico-wrap"><Icone nome={i.icone} />{i.href === '/app/chat' && nao > 0 && <span className="selo" aria-label={`${nao} mensagens novas`}>{nao > 9 ? '9+' : nao}</span>}</span>{i.nome}</Link>;
  return (<>
    {aviso && (
      <Link href={aviso.href} className="toast" role="status" aria-live="polite" onClick={fechar}>
        <Icone nome="chat" /><span><b>Nova mensagem</b> · às {aviso.hora}<small>{aviso.texto}</small></span>
      </Link>
    )}
    <header className="topo"><div className="topo-in">
      <Link href="/app" className="marca" aria-label="Panthu, página inicial"><Logo /></Link>
      <nav className="nav" aria-label="Principal">{itens.map(aba)}</nav>
      <div className="acoes"><span className="nav-sair"><Sair /></span></div>
    </div></header>
    <nav className="abas-baixo" aria-label="Navegação">{itens.map(aba)}<Sair aba /></nav>
  </>);
}
