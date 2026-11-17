// Ícones dos jogos (traço dourado, no estilo do menu).
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
export default function IconeJogo({ id, tam = 44 }) {
  const svg = (children) => <svg viewBox="0 0 48 48" width={tam} height={tam} aria-hidden="true" {...P}>{children}</svg>;
  switch (id) {
    case 'xadrez': return svg(<><path d="M17 40h14M19 40c0-6 1-9 3-12-4-1-7-5-7-10 0-5 4-9 9-9 4 0 7 2 8 5l-5 3 4 4c0 8-4 11-5 19" /><circle cx="22" cy="16" r="1" fill="currentColor" /></>);
    case 'truco': return svg(<><rect x="9" y="8" width="20" height="28" rx="3" transform="rotate(-10 19 22)" /><rect x="19" y="10" width="20" height="28" rx="3" transform="rotate(8 29 24)" /><path d="M29 20l3 4-3 4-3-4z" fill="currentColor" /></>);
    case 'memoria': return svg(<><rect x="6" y="8" width="16" height="14" rx="3" /><rect x="26" y="8" width="16" height="14" rx="3" /><rect x="6" y="26" width="16" height="14" rx="3" /><rect x="26" y="26" width="16" height="14" rx="3" /><path d="M14 15v0M34 33v0" strokeWidth="5" /></>);
    case 'paciencia': return svg(<><path d="M14 8h20M14 40h20M16 8c0 8 6 10 8 16-2 6-8 8-8 16M32 8c0 8-6 10-8 16 2 6 8 8 8 16" /><path d="M20 36h8" /></>);
    case 'cacapalavras': return svg(<><circle cx="20" cy="20" r="11" /><path d="M28 28l12 12" /><path d="M14 20h12M20 14v12" opacity=".5" /></>);
    default: return svg(<rect x="10" y="10" width="28" height="28" rx="4" />);
  }
}
