'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MANUAL } from '@/lib/manualAdmin';

const sem = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Manual do administrador: busca + categorias + perguntas que abrem com o passo a passo.
export default function ManualAdmin() {
  const [busca, setBusca] = useState('');
  const [sec, setSec] = useState('todas');
  const termos = sem(busca).split(/\s+/).filter(Boolean);

  const secoes = useMemo(() => MANUAL
    .filter((s) => sec === 'todas' || s.id === sec)
    .map((s) => ({ ...s, perguntas: s.perguntas.filter((p) => {
      if (!termos.length) return true;
      const txt = sem(`${p.q} ${p.passos.join(' ')} ${p.dica || ''}`);
      return termos.every((t) => txt.includes(t));
    }) }))
    .filter((s) => s.perguntas.length), [sec, busca]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = secoes.reduce((n, s) => n + s.perguntas.length, 0);

  return (<>
    <div className="card">
      <div className="campo"><label htmlFor="mn-busca">Buscar no manual</label>
        <input id="mn-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: faturamento, bloquear, evento, senha" autoComplete="off" /></div>
      <div className="mn-chips" role="group" aria-label="Assuntos">
        <button type="button" className={`btn mini ${sec === 'todas' ? 'p' : 'o'}`} onClick={() => setSec('todas')}>Todos</button>
        {MANUAL.map((s) => <button key={s.id} type="button" className={`btn mini ${sec === s.id ? 'p' : 'o'}`} onClick={() => setSec(s.id)}>{s.icone} {s.titulo}</button>)}
      </div>
    </div>
    <p style={{ color: 'var(--suave)' }} role="status">{total} {total === 1 ? 'pergunta' : 'perguntas'}</p>
    {secoes.length === 0 && <div className="card vazio"><h3>Nada encontrado</h3><p>Tente outra palavra, como “evento”, “usuário” ou “financeiro”.</p></div>}
    {secoes.map((s) => (
      <section key={s.id} className="card mn-secao">
        <h2 style={{ fontSize: 20, marginTop: 0 }}>{s.icone} {s.titulo}</h2>
        {s.perguntas.map((p) => (
          <details key={p.q} className="mn-pergunta" open={termos.length > 0 && total <= 3}>
            <summary>{p.q}</summary>
            <ol>{p.passos.map((x, i) => <li key={i}>{x}</li>)}</ol>
            {p.dica && <p className="mn-dica">💡 {p.dica}</p>}
            {p.ir && <Link className="btn ouro mini" href={p.ir[0]}>{p.ir[1]} →</Link>}
          </details>
        ))}
      </section>
    ))}
  </>);
}
