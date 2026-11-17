'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from '@/components/Icone';

import { AREAS as GRUPOS } from '@/lib/adm';

export default function AdminNav() {
  const path = usePathname() || '';
  return (
    <nav className="adm-menu" aria-label="Administração">
      {GRUPOS.map(([titulo, itens]) => (
        <div className="adm-grupo" key={titulo}>
          <span className="adm-titulo">{titulo}</span>
          {itens.map(([href, nome, ic]) => {
            const ativo = href === '/admin' ? path === '/admin' : path.startsWith(href);
            return <Link key={href} href={href} aria-current={ativo ? 'page' : undefined}><Icone nome={ic} />{nome}</Link>;
          })}
        </div>
      ))}
    </nav>
  );
}
