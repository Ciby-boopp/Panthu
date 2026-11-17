import Link from 'next/link';
// Sub-abas de uma área. itens = [[valor, rótulo]]; usa ?aba=valor (ou href completo quando começa com "/").
export default function AdmAbas({ base, itens, ativo }) {
  return (
    <nav className="subabas chips-nav" aria-label="Seções da área">
      {itens.map(([v, t]) => <Link key={v} href={v.startsWith('/') ? v : `${base}?aba=${v}`} aria-current={v === ativo ? 'page' : undefined}>{t}</Link>)}
    </nav>
  );
}
export const abaDe = (sp, validas, padrao) => (validas.includes(sp?.aba) ? sp.aba : padrao);
export function Aviso({ erro }) {
  return erro ? <p className="msg erro">Não consegui carregar. Rode o arquivo <b>supabase/adm-v3.sql</b> no Supabase e recarregue. (Detalhe: {erro.message})</p> : null;
}
