'use client';
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';
import { CATEGORIAS } from '@/lib/categorias';
import Avatar from './Avatar';
import './chat.css';

const km = (d) => (d == null ? '' : d < 1 ? 'menos de 1 km' : `${String(d).replace('.', ',')} km`);
const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const pegarPosicao = () => new Promise((ok, falha) => {
  if (!navigator.geolocation) return falha(new Error('Este aparelho não oferece localização.'));
  navigator.geolocation.getCurrentPosition(
    (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
    (e) => falha(new Error(e.code === 1 ? 'Permissão negada. Libere a localização nas configurações do navegador e tente de novo.' : 'Não foi possível obter sua localização agora.')),
    { timeout: 12000, maximumAge: 60000 });
});

export default function Proximo() {
  const sb = criarCliente();
  const [compartilhando, setCompartilhando] = useState(false);
  const [pos, setPos] = useState(null);
  const [aba, setAba] = useState('eventos');
  const [raio, setRaio] = useState('10');
  const [categoria, setCategoria] = useState('');
  const [pessoas, setPessoas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [msg, setMsg] = useState(null);
  const [c, setC] = useState(false);

  useEffect(() => { sb.from('localizacoes').select('compartilhar').maybeSingle().then(({ data }) => setCompartilhando(!!data?.compartilhar)); }, []); // eslint-disable-line

  const buscar = useCallback(async () => {
    if (!pos) return;
    setC(true);
    const ev = await sb.rpc('eventos_proximos', { p_lat: pos.lat, p_lng: pos.lng, p_raio: Number(raio), p_categoria: categoria || null });
    if (ev.error) setMsg({ t: 'erro', m: 'Não foi possível buscar eventos. Confira se o SQL das novas funcionalidades foi executado no Supabase.' }); else { setEventos(ev.data || []); setMsg(null); }
    if (compartilhando) {
      const pe = await sb.rpc('pessoas_proximas', { p_lat: pos.lat, p_lng: pos.lng, p_raio: Number(raio) });
      setPessoas(pe.error ? [] : pe.data || []);
    } else setPessoas([]);
    setC(false);
  }, [pos, raio, categoria, compartilhando]); // eslint-disable-line
  useEffect(() => { buscar(); }, [buscar]);

  async function usar(compartilhar) {
    setC(true); setMsg(null);
    try {
      const p = await pegarPosicao();
      if (compartilhar) {
        const { error } = await sb.rpc('atualizar_localizacao', { p_lat: p.lat, p_lng: p.lng });
        if (error) throw new Error('Não foi possível salvar sua localização.');
        setCompartilhando(true);
      }
      setPos(p);
    } catch (e) { setMsg({ t: 'erro', m: e.message }); }
    setC(false);
  }
  async function desligar() {
    await sb.rpc('parar_compartilhar'); setCompartilhando(false); setPessoas([]);
    setMsg({ t: 'ok', m: 'Compartilhamento desligado. Sua localização guardada foi apagada.' });
  }

  return (<>
    <div className="card">
      <h3>Sua privacidade</h3>
      <p style={{ color: 'var(--suave)', marginTop: 4 }}>Você só aparece para outras pessoas se ativar o compartilhamento. Guardamos apenas uma posição aproximada (cerca de 1 km), que deixa de valer após 12 horas sem atualizar. Salvar alguém como amigo não compartilha sua localização.</p>
      <div className="linha" style={{ justifyContent: 'flex-start', gap: 8 }}>
        {compartilhando
          ? <><span className="tag ok">Compartilhando</span><button className="btn o mini" onClick={desligar}>Desligar compartilhamento</button></>
          : <button className="btn p" disabled={c} onClick={() => usar(true)}>Ativar e compartilhar minha localização</button>}
        {!pos && !compartilhando && <button className="btn s" disabled={c} onClick={() => usar(false)}>Só ver eventos perto de mim</button>}
        {pos && <button className="btn s mini" disabled={c} onClick={() => usar(compartilhando)}>Atualizar localização</button>}
      </div>
    </div>
    {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
    {pos && (<>
      <div className="abas">
        <button className={`btn mini ${aba === 'eventos' ? 'p' : 'o'}`} onClick={() => setAba('eventos')}>Eventos</button>
        <button className={`btn mini ${aba === 'pessoas' ? 'p' : 'o'}`} onClick={() => setAba('pessoas')}>Pessoas</button>
      </div>
      <div className="dois">
        <div className="campo"><label htmlFor="raio">Distância</label>
          <select id="raio" value={raio} onChange={e => setRaio(e.target.value)}>{[1, 5, 10, 25, 50].map(r => <option key={r} value={r}>até {r} km</option>)}</select></div>
        {aba === 'eventos' && <div className="campo"><label htmlFor="cat">Categoria</label>
          <select id="cat" value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas</option>{CATEGORIAS.map(x => <option key={x}>{x}</option>)}</select></div>}
      </div>
      {c && <p className="carregando">Buscando…</p>}
      {aba === 'eventos' && !c && (<>
        {eventos.length === 0 && <div className="card vazio"><h3>Nenhum evento por perto</h3><p>Aumente a distância ou mude a categoria. Só aparecem eventos de locais com coordenadas cadastradas.</p></div>}
        <div className="grade-eventos">{eventos.map(e => (
          <Link key={e.id} href={`/app/evento/${e.id}`}>
            <div className="card evento"><div className="banner">{e.banner_url && <img className="capa" src={e.banner_url} alt="" />}<h3>{e.nome}</h3><div>{quando(e.inicio)}</div></div>
              <div className="corpo"><div><span className="tag ok">{km(e.distancia_km)}</span>{e.categoria && <span className="tag">{e.categoria}</span>}<span className="tag">{e.total} confirmados</span></div>
                <small>{e.local}{e.endereco ? ` · ${e.endereco}` : ''}</small></div></div>
          </Link>))}</div>
      </>)}
      {aba === 'pessoas' && !c && (<div className="card">
        {!compartilhando && <p style={{ color: 'var(--suave)' }}>Para ver quem está por perto, ative o compartilhamento da sua localização. É uma troca: você só vê quem também compartilha.</p>}
        {compartilhando && pessoas.length === 0 && <p className="vazio">Ninguém compartilhando por perto agora.</p>}
        {pessoas.map(p => (
          <div className="pessoa-linha" key={p.usuario_id}>
            <Link className="pessoa-link" href={`/app/pessoa/${p.usuario_id}`}><Avatar url={p.foto_url} nome={p.nome} tam={40} />{p.nome}</Link>
            <span className="tag ok">{km(p.distancia_km)}</span>
          </div>))}
      </div>)}
    </>)}
  </>);
}
