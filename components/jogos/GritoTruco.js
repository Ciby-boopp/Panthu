'use client';
import { useEffect, useState } from 'react';

// Falar em voz alta (se o aparelho permitir e a pessoa não tiver desligado o som).
export function falar(texto) {
  try {
    if (localStorage.getItem('panthu_grito_mudo') === '1') return;
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(texto.replace(/!/g, ''));
    u.lang = 'pt-BR'; u.rate = 1.15; u.pitch = 1.5; u.volume = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {}
}

// Tela ilustrada do grito: soco na mesa, balão com o texto e ondas de som. Some sozinha em ~1,8 s.
export default function GritoTruco({ grito }) {
  const [vis, setVis] = useState(null);
  useEffect(() => {
    if (!grito) return;
    setVis(grito); falar(grito.texto);
    const t = setTimeout(() => setVis(null), 1800);
    return () => clearTimeout(t);
  }, [grito?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!vis) return null;
  return (
    <div className={`grito grito-${vis.tipo || 'truco'}`} role="alert" aria-live="assertive">
      <svg viewBox="0 0 320 220" className="grito-svg" aria-hidden="true">
        <polygon className="grito-estrela" points="160,8 186,62 246,40 222,98 300,110 226,138 262,196 192,172 160,214 128,172 58,196 94,138 20,110 98,98 74,40 134,62" />
        <g className="grito-soco">
          <rect x="112" y="92" width="96" height="60" rx="18" fill="#E7B98A" stroke="#7A4B25" strokeWidth="5" />
          <path d="M138 92v34M160 92v34M182 92v34" stroke="#7A4B25" strokeWidth="5" strokeLinecap="round" />
          <rect x="96" y="128" width="40" height="46" rx="14" fill="#E7B98A" stroke="#7A4B25" strokeWidth="5" />
          <rect x="196" y="120" width="44" height="40" rx="12" fill="#C9854D" stroke="#7A4B25" strokeWidth="5" />
        </g>
        <rect x="30" y="176" width="260" height="14" rx="7" fill="#6B3F1F" />
        <g className="grito-ondas" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"><path d="M40 70q-14 14 0 28M24 58q-26 26 0 52" /><path d="M280 70q14 14 0 28M296 58q26 26 0 52" /></g>
      </svg>
      <div className="grito-texto">{vis.texto}</div>
      <div className="grito-quem">{vis.quem}</div>
    </div>
  );
}
