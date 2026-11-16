'use client';
import { useEffect, useState } from 'react';

const PADRAO = { texto: 'normal', contraste: 'normal', movimento: 'normal' };
export function aplicarAcessibilidade(a) {
  const h = document.documentElement;
  h.dataset.texto = a.texto; h.dataset.contraste = a.contraste; h.dataset.movimento = a.movimento;
}
// Preferências de leitura. Ficam neste aparelho (localStorage) e são aplicadas antes da página aparecer (script no layout).
export default function Acessibilidade() {
  const [a, setA] = useState(PADRAO);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem('panthu_acess') || 'null'); if (s) setA({ ...PADRAO, ...s }); } catch {} }, []);
  const mudar = (k, v) => {
    const n = { ...a, [k]: v }; setA(n); aplicarAcessibilidade(n);
    try { localStorage.setItem('panthu_acess', JSON.stringify(n)); } catch {}
  };
  const grupo = (k, rotulo, ops) => (
    <div className="campo"><label id={`ac-${k}`}>{rotulo}</label>
      <div className="j-acoes" role="group" aria-labelledby={`ac-${k}`} style={{ justifyContent: 'flex-start' }}>
        {ops.map(([v, t]) => <button key={v} type="button" className={`btn mini ${a[k] === v ? 'p' : 'o'}`} aria-pressed={a[k] === v} onClick={() => mudar(k, v)}>{t}</button>)}
      </div>
    </div>
  );
  return (
    <section className="card" aria-label="Acessibilidade">
      <h3>Acessibilidade</h3>
      <p style={{ color: 'var(--suave)', marginTop: 4 }}>Ajuste a leitura do app. O Panthu funciona com leitores de tela e navegação pelo teclado.</p>
      {grupo('texto', 'Tamanho do texto', [['normal', 'Normal'], ['grande', 'Grande'], ['maior', 'Maior']])}
      {grupo('contraste', 'Contraste', [['normal', 'Normal'], ['alto', 'Alto contraste']])}
      {grupo('movimento', 'Animações', [['normal', 'Normais'], ['reduzido', 'Reduzidas']])}
    </section>
  );
}
