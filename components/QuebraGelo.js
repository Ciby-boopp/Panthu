'use client';
import { useState } from 'react';
import Icone from './Icone';
import { QUEBRA_GELO, TODAS } from '@/lib/quebra-gelo';

// Mostra sugestões para puxar assunto. Ao tocar numa, ela vai para o campo de mensagem (a pessoa pode editar antes de enviar).
export default function QuebraGelo({ aoEscolher, aberto, aoAlternar }) {
  const [grupo, setGrupo] = useState(0);
  const [rodada, setRodada] = useState(0);
  const frases = QUEBRA_GELO[grupo].frases;
  const mostradas = [0, 1, 2].map(i => frases[(rodada * 3 + i) % frases.length]).filter((f, i, a) => a.indexOf(f) === i);
  return (
    <div className="gelo">
      <button type="button" className="btn s mini" aria-expanded={aberto} onClick={aoAlternar}><Icone nome="gelo" />Quebra-gelo</button>
      {aberto && (
        <div className="gelo-painel">
          <div className="abas" role="tablist" aria-label="Tipos de quebra-gelo">
            {QUEBRA_GELO.map((g, i) => (
              <button key={g.grupo} type="button" role="tab" aria-selected={i === grupo} className={`btn mini ${i === grupo ? 'p' : 'o'}`}
                onClick={() => { setGrupo(i); setRodada(0); }}>{g.grupo}</button>
            ))}
          </div>
          <div className="gelo-lista">
            {mostradas.map(f => <button key={f} type="button" className="gelo-chip" onClick={() => aoEscolher(f)}>{f}</button>)}
          </div>
          {frases.length > 3 && <button type="button" className="link-btn" onClick={() => setRodada(r => r + 1)}>Mais ideias</button>}
        </div>
      )}
    </div>
  );
}
