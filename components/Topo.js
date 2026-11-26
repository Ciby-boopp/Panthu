'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import Sair from './Sair';
import Icone from './Icone';
import useChatAviso from './useChatAviso';
import RegistrarAtividade from './RegistrarAtividade';

const ATALHOS = [
  ['/app/configuracoes', 'Configurações', 'adm'], ['/app/proximo', 'Perto de você', 'local'], ['/app/buscar', 'Encontrar pessoas', 'busca'], ['/app/amigos', 'Meus amigos', 'usuarios'],
  ['/app/favoritos', 'Favoritos', 'check'], ['/app/pontos', 'Meus pontos', 'check'], ['/app/convidar', 'Convidar amigos', 'enviar'], ['/app/quero-ser-host', 'Quero ser host', 'host'], ['/app/manual', 'Manual de uso', 'busca'], ['/diretrizes', 'Diretrizes da comunidade', 'check'],
];

export default function Topo({ papel }) {
  const path = usePathname() || '';
  const { nao, aviso, fechar } = useChatAviso(path);
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [path]);
  const ehInicio = path === '/app';
  const itens = [
    { href: '/app', nome: 'Início', icone: 'host', ativo: ehInicio },
    { href: '/app/jogos', nome: 'Jogos', icone: 'jogos', ativo: path.startsWith('/app/jogos') },
    { href: '/app/chat', nome: 'Bate-papo', icone: 'usuarios', ativo: path.startsWith('/app/chat'), badge: true },
    { href: '/app/eventos', nome: 'Eventos', icone: 'eventos', ativo: path.startsWith('/app/eventos') || path.startsWith('/app/evento') },
    { href: '/app/perfil', nome: 'Meu Perfil', icone: 'perfil', ativo: path.startsWith('/app/perfil') || path.startsWith('/app/pessoa') },
    { href: '/app/proximo', nome: 'Perto', icone: 'local', ativo: path.startsWith('/app/proximo') || path.startsWith('/app/amigos'), so: 'desk' },
    ...(['host', 'admin'].includes(papel) ? [{ href: '/host', nome: 'Host', icone: 'host', ativo: path.startsWith('/host'), so: 'desk' }] : []),
    ...(papel === 'admin' ? [{ href: '/admin', nome: 'ADM', icone: 'adm', ativo: path.startsWith('/admin'), so: 'desk' }] : []),
  ];
  const aba = (i) => <Link key={i.href} href={i.href} className="aba" aria-current={i.ativo ? 'page' : undefined}><span className="ico-wrap"><Icone nome={i.icone} />{i.badge && nao > 0 && <span className="selo" aria-label={`${nao} mensagens novas`}>{nao > 9 ? '9+' : nao}</span>}</span>{i.nome}</Link>;
  const baixo = itens.filter((i) => !i.so);
  const mais = [...ATALHOS, ...(['host', 'admin'].includes(papel) ? [['/host', 'Área do Host', 'host']] : []), ...(papel === 'admin' ? [['/admin', 'Painel ADM', 'adm']] : [])];
  return (<>
    <RegistrarAtividade />
    {aviso && (
      <Link href={aviso.href} className="toast" role="status" aria-live="polite" onClick={fechar}>
        <Icone nome="chat" /><span><b>{aviso.titulo || 'Nova mensagem'}</b> · às {aviso.hora}<small>{aviso.texto}</small></span>
      </Link>
    )}
    <header className="topo"><div className="topo-in">
      <Link href="/app" className="marca" aria-label="Panthu, página inicial"><Logo /></Link>
      <nav className="nav" aria-label="Principal">{itens.map(aba)}</nav>
      <div className="acoes">
        <button type="button" className="icone-btn mais-topo" aria-label="Mais atalhos" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><span aria-hidden="true">{menu ? '×' : '☰'}</span></button>
        <Link href="/app/chat" className="icone-btn sino" aria-label={nao > 0 ? `Notificações: ${nao} novas` : 'Notificações'}><Icone nome="alerta" />{nao > 0 && <span className="selo">{nao > 9 ? '9+' : nao}</span>}</Link>
        <span className="nav-sair"><Sair /></span>
      </div>
    </div></header>
    {menu && <div className="mais-fundo" onClick={() => setMenu(false)} />}
    {menu && (
      <div className="mais-folha" role="dialog" aria-label="Atalhos">
        <div className="mais-grade">
          {mais.map(([href, nome, ic]) => <Link key={href} href={href} className="mais-item"><Icone nome={ic} /><span>{nome}</span></Link>)}
        </div>
        <Sair />
      </div>
    )}
    <nav className="abas-baixo" aria-label="Navegação">
      {baixo.map(aba)}
    </nav>
  </>);
}
