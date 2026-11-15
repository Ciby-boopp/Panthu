'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from '@/components/Icone';

// Só entram aqui páginas que existem e funcionam. Cada módulo novo é adicionado quando fica pronto.
const GRUPOS = [
  ['Visão geral', [['/admin', 'Painel', 'adm'], ['/admin/conexoes', 'Conexões', 'usuarios']]],
  ['Operação', [['/admin/usuarios', 'Usuários', 'perfil'], ['/admin/eventos', 'Eventos', 'eventos'], ['/admin/estabelecimentos', 'Estabelecimentos', 'local'], ['/admin/avaliacoes', 'Avaliações', 'check']]],
  ['Segurança', [['/admin/denuncias', 'Denúncias', 'alerta'], ['/admin/auditoria', 'Auditoria', 'busca']]]
];

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
