'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const ABAS = [['/admin', 'Painel'], ['/admin/eventos', 'Eventos'], ['/admin/estabelecimentos', 'Estabelecimentos'], ['/admin/usuarios', 'Usuários'], ['/admin/denuncias', 'Denúncias'], ['/admin/avaliacoes', 'Avaliações']];
export default function AdminNav() {
  const path = usePathname() || '';
  return (
    <nav className="subnav" aria-label="Administração">
      {ABAS.map(([href, nome]) => {
        const ativo = href === '/admin' ? path === '/admin' : path.startsWith(href);
        return <Link key={href} href={href} aria-current={ativo ? 'page' : undefined}>{nome}</Link>;
      })}
    </nav>
  );
}
