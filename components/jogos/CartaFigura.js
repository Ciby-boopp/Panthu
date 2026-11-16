// Carta da Memória com figura. Com onClick vira botão. Sem figura (f nulo) mostra o verso.
export default function CartaFigura({ f, baixo = false, sel = false, onClick, desabilitada = false, largura }) {
  const cls = `carta fig${baixo || !f ? ' verso' : ''}${sel ? ' sel' : ''}`;
  const st = largura ? { '--w': largura } : undefined;
  const miolo = baixo || !f ? null : <span className="c-n" aria-hidden="true">{f.emoji}</span>;
  const rotulo = baixo || !f ? 'Carta virada' : f.nome;
  if (onClick) return <button type="button" className={cls} style={st} onClick={onClick} disabled={desabilitada} aria-label={rotulo}>{miolo}</button>;
  return <div className={cls} style={st} role="img" aria-label={rotulo}>{miolo}</div>;
}
