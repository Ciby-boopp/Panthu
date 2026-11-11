'use client';
import Icone from './Icone';
// Alterna entre dia e noite sem recarregar e guarda a escolha (o script em layout.js aplica o tema salvo antes da tela aparecer).
export default function ThemeToggle() {
  function alternar() {
    const html = document.documentElement;
    const novo = html.dataset.tema === 'escuro' ? 'claro' : 'escuro';
    html.dataset.tema = novo;
    try { localStorage.setItem('panthu-tema', novo); } catch {}
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', novo === 'escuro' ? '#0C1B18' : '#164F46');
  }
  return (
    <button type="button" className="icone-btn tema" onClick={alternar} aria-label="Alternar entre modo dia e modo noite" title="Modo dia / noite">
      <Icone nome="sol" className="sol" /><Icone nome="lua" className="lua" />
    </button>
  );
}
