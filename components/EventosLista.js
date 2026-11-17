'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icone from './Icone';
import FavoritoBotao from './FavoritoBotao';
/* eslint-disable @next/next/no-img-element */
export default function EventosLista({ eventos, vazio, inicial = '' }) {
  const [q, setQ] = useState(inicial);
  const termo = q.trim().toLowerCase();
  const lista = eventos.filter(e => !termo || `${e.nome} ${e.local}`.toLowerCase().includes(termo));
  return (<>
    <div className="busca">
      <Icone nome="busca" />
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar encontro ou local" aria-label="Buscar encontro ou local" />
    </div>
    {lista.length === 0 && <div className="card vazio"><h3>{eventos.length === 0 ? vazio.titulo : 'Nenhum encontro encontrado'}</h3><p>{eventos.length === 0 ? vazio.texto : 'Tente outro nome ou limpe a busca.'}</p></div>}
    <div className="ev-lista">
      {lista.map(e => (
        <div className="ev-card" key={e.id}>
          <Link href={`/app/evento/${e.id}`} className="ev-link" aria-label={`${e.nome}, ${e.quando}`}>
            <div className="ev-thumb">
              {e.banner_url ? <img src={e.banner_url} alt="" /> : <span className="ev-sem">{e.logo_url ? <img src={e.logo_url} alt="" /> : '🎉'}</span>}
              <span className="selo-data" aria-hidden="true"><small>{e.mes}</small><b>{e.dia}</b></span>
            </div>
            <div className="ev-info">
              <h3>{e.nome}</h3>
              <span className="ev-linha"><Icone nome="local" />{e.local}</span>
              <span className="ev-linha"><Icone nome="eventos" />{e.hora}{e.confirmado && <span className="tag ok" style={{ margin: '0 0 0 8px' }}>Você vai!</span>}</span>
              <span className="ev-linha"><Icone nome="usuarios" />{e.total}{e.capacidade ? ` de ${e.capacidade}` : ''} confirmados</span>
            </div>
          </Link>
          <span className="ev-fav"><FavoritoBotao tipo="evento" id={e.id} inicial={e.favorito} compacto rotulo={e.nome} /></span>
        </div>
      ))}
    </div>
  </>);
}
