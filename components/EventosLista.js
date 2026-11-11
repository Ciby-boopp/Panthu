'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icone from './Icone';
/* eslint-disable @next/next/no-img-element */
export default function EventosLista({ eventos }) {
  const [q, setQ] = useState('');
  const [so, setSo] = useState(false);
  const termo = q.trim().toLowerCase();
  const lista = eventos.filter(e => (!so || e.confirmado) && (!termo || `${e.nome} ${e.local}`.toLowerCase().includes(termo)));
  return (<>
    <div className="busca">
      <Icone nome="busca" />
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar encontro ou local" aria-label="Buscar encontro ou local" />
    </div>
    <div className="abas">
      <button type="button" className={`btn mini ${!so ? 'p' : 'o'}`} onClick={() => setSo(false)}>Todos</button>
      <button type="button" className={`btn mini ${so ? 'p' : 'o'}`} onClick={() => setSo(true)}>Minhas presenças</button>
    </div>
    {lista.length === 0 && <div className="card vazio"><h3>{eventos.length === 0 ? 'Nenhum encontro marcado ainda' : 'Nenhum encontro encontrado'}</h3><p>{eventos.length === 0 ? 'Assim que um novo encontro for publicado, ele aparece aqui.' : 'Tente outro nome ou limpe o filtro.'}</p></div>}
    <div className="grade-eventos">
      {lista.map(e => (
        <Link key={e.id} href={`/app/evento/${e.id}`}>
          <div className="card evento">
            <div className="banner">
              {e.banner_url && <img className="capa" src={e.banner_url} alt="" />}
              <h3>{e.nome}</h3><div>{e.quando}</div>
              <div className="local">
                <div className="logo-local">{e.logo_url ? <img src={e.logo_url} alt="" /> : 'logo'}</div>
                <b>{e.local}</b>
              </div>
            </div>
            <div className="corpo">
              <div>{e.confirmado && <span className="tag ok">Presença confirmada</span>}
                <span className="tag">{e.total}{e.capacidade ? ` de ${e.capacidade}` : ''} confirmados</span></div>
              {e.capacidade && <div className="barra"><i style={{ width: `${Math.min(100, (e.total / e.capacidade) * 100)}%` }} /></div>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  </>);
}
