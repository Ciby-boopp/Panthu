import { NOME_NAIPE, vermelho } from '@/lib/cartas';

// Uma carta. Com onClick vira botão; sem, é só imagem. "largura" aceita qualquer medida CSS (ex.: "64px").
export default function Carta({ c, baixo = false, sel = false, onClick, desabilitada = false, largura, style }) {
  const cls = `carta${baixo ? ' verso' : vermelho(c.n) ? ' verm' : ''}${sel ? ' sel' : ''}`;
  const st = { ...(largura ? { '--w': largura } : null), ...style };
  const miolo = baixo ? null : (<><span className="c-v">{c.v}{c.n}</span><span className="c-n">{c.n}</span></>);
  const rotulo = baixo ? 'Carta virada' : `${c.v} de ${NOME_NAIPE[c.n]}`;
  if (onClick) return <button type="button" className={cls} style={st} onClick={onClick} disabled={desabilitada} aria-label={rotulo} aria-pressed={sel || undefined}>{miolo}</button>;
  return <div className={cls} style={st} role="img" aria-label={rotulo}>{miolo}</div>;
}
