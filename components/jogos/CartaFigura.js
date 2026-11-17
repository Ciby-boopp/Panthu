/* eslint-disable @next/next/no-img-element */
// Carta da Memória com a figura (imagem). Sem figura (f nulo) ou virada mostra o verso com o logo do Panthu.
export default function CartaFigura({ f, baixo = false, sel = false, onClick, desabilitada = false, largura }) {
  const verso = baixo || !f;
  const cls = `carta fig${verso ? ' verso-logo' : ''}${sel ? ' sel' : ''}`;
  const st = largura ? { '--w': largura } : undefined;
  const miolo = verso ? null : <img src={f.img} alt="" draggable="false" />;
  const rotulo = verso ? 'Carta virada' : f.nome;
  if (onClick) return <button type="button" className={cls} style={st} onClick={onClick} disabled={desabilitada} aria-label={rotulo}>{miolo}</button>;
  return <div className={cls} style={st} role="img" aria-label={rotulo}>{miolo}</div>;
}
