'use client';
import { useEffect, useRef, useState } from 'react';

// Duelo em que cada jogador joga o seu próprio tabuleiro (mesmo desafio) e, no fim, os resultados são comparados.
// renderJogo({ aoFim, aoProgresso, ele }) desenha o jogo. comparar(eu, ele) devolve >0 (eu venci), <0 (ele venceu) ou 0.
// resumo(r) devolve o texto do resultado de um jogador. pontos vem de r.pontos.
export default function DueloCorrida({ enviar, ouvir, aoTerminar, renderJogo, comparar, resumo }) {
  const [eu, setEu] = useState(null);
  const [ele, setEle] = useState(null);
  const [prog, setProg] = useState(null);
  const enviado = useRef(false);

  useEffect(() => {
    const a = ouvir('fim', (p) => setEle(p));
    const b = ouvir('prog', (p) => setProg(p));
    return () => { a(); b(); };
  }, [ouvir]);

  const aoFim = (r) => { setEu(r); enviar('fim', r); };
  const aoProgresso = (p) => enviar('prog', p);
  // O resultado do amigo pode chegar antes do meu: se eu terminei depois, reenvio o meu para ele.
  useEffect(() => { if (eu && !ele) { const t = setInterval(() => enviar('fim', eu), 4000); return () => clearInterval(t); } }, [eu, ele, enviar]);

  const pronto = eu && ele;
  const cmp = pronto ? comparar(eu, ele) : 0;
  useEffect(() => {
    if (!pronto || enviado.current) return;
    enviado.current = true;
    aoTerminar?.({ pontos: eu.pontos || 0, vitoria: cmp === 0 ? null : cmp > 0, detalhes: { online: true, eu, ele } });
  }, [pronto]); // eslint-disable-line react-hooks/exhaustive-deps

  return (<>
    {renderJogo({ aoFim, aoProgresso, ele: prog, terminou: !!eu })}
    {ele && !eu && <p className="msg ok" role="status">O amigo já terminou: {resumo(ele)}. Termine o seu para ver quem venceu.</p>}
    {eu && !ele && <p className="msg ok" role="status">Você terminou: {resumo(eu)}. Aguardando o amigo terminar…</p>}
    {pronto && (
      <div className="card" role="status" style={{ textAlign: 'center' }}>
        <h3>{cmp === 0 ? 'Empate!' : cmp > 0 ? '🏆 Você venceu!' : 'O amigo venceu desta vez.'}</h3>
        <p style={{ marginBottom: 0 }}>Você: <b>{resumo(eu)}</b> · Amigo: <b>{resumo(ele)}</b></p>
      </div>
    )}
  </>);
}
