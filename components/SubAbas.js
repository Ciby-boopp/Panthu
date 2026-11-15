import Link from 'next/link';
// Sub-abas de navegação dentro de uma seção. `itens` = [[href, rótulo], ...]; `ativo` = href da aba atual.
export default function SubAbas({ itens, ativo, rotulo = 'Seções' }) {
  return (
    <nav className="subabas" aria-label={rotulo}>
      {itens.map(([href, nome]) => <Link key={href} href={href} aria-current={href === ativo ? 'page' : undefined}>{nome}</Link>)}
    </nav>
  );
}
