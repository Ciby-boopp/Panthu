'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';
import Avatar from './Avatar';
import AmigoBotao from './AmigoBotao';

// Escolhe a cidade, digita o nome e mostra todo mundo com esse nome naquela cidade.
export default function BuscarPessoas({ cidades, euId }) {
  const sb = useRef(null);
  const [cidade, setCidade] = useState(cidades[0]?.cidade || '');
  const [nome, setNome] = useState('');
  const [lista, setLista] = useState(null);
  const [c, setC] = useState(false);
  const [erro, setErro] = useState(null);

  async function buscar(e) {
    e.preventDefault();
    if (nome.trim().length < 2) { setErro('Digite pelo menos 2 letras do nome.'); return; }
    setC(true); setErro(null);
    const { data, error } = await (sb.current ||= criarCliente()).rpc('buscar_pessoas', { p_cidade: cidade, p_nome: nome });
    setC(false);
    if (error) { setErro('Não foi possível buscar agora.'); return; }
    setLista(data || []);
  }

  if (cidades.length === 0) return <div className="card vazio">Ainda não há cidades com pessoas cadastradas.</div>;

  return (<>
    <form className="card" onSubmit={buscar}>
      <div className="campo"><label htmlFor="bp-cid">Cidade</label>
        <select id="bp-cid" value={cidade} onChange={(e) => { setCidade(e.target.value); setLista(null); }}>
          {cidades.map((x) => <option key={x.cidade} value={x.cidade}>{x.cidade} ({x.total})</option>)}
        </select></div>
      <div className="campo"><label htmlFor="bp-nome">Nome da pessoa</label>
        <input id="bp-nome" type="search" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Ex.: Maria" autoComplete="off" /></div>
      {erro && <div className="msg erro" role="status">{erro}</div>}
      <button className="btn p" disabled={c}>{c ? 'Buscando…' : 'Buscar'}</button>
    </form>
    {lista && (lista.length === 0
      ? <div className="card vazio">Ninguém com esse nome em {cidade}. Confira a escrita ou tente só o primeiro nome.</div>
      : <div className="card">
          <p style={{ marginTop: 0, color: 'var(--suave)' }}>{lista.length} {lista.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'} em {cidade}</p>
          {lista.map((p) => (
            <div className="pessoa-linha" key={p.id}>
              <Link className="pessoa-link" href={`/app/pessoa/${p.id}`}><Avatar url={p.foto_url} nome={p.nome} tam={44} />{p.nome}</Link>
              <AmigoBotao id={p.id} euId={euId} inicial={p.eh_amigo} />
            </div>
          ))}
        </div>)}
  </>);
}
