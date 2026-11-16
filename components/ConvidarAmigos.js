'use client';
import { useState } from 'react';

export default function ConvidarAmigos({ codigo, lista }) {
  const [copiado, setCopiado] = useState('');
  const link = typeof window !== 'undefined' ? `${location.origin}/entrar?ref=${codigo}` : `/entrar?ref=${codigo}`;
  const texto = `Venha para o Panthu, uma comunidade de amizade e encontros. Entre pelo meu link: ${link} (ou use o código ${codigo})`;
  async function copiar(t, k) { try { await navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(''), 2000); } catch { setCopiado('erro'); } }
  async function compartilhar() {
    if (navigator.share) { try { await navigator.share({ title: 'Panthu', text: texto, url: link }); return; } catch {} }
    copiar(texto, 'link');
  }
  return (<>
    <div className="card" style={{ textAlign: 'center' }}>
      <p style={{ margin: 0, color: 'var(--suave)' }}>Seu código de indicação</p>
      <p className="j-codigo" aria-label={`Código ${codigo.split('').join(' ')}`}>{codigo}</p>
      <div className="j-acoes">
        <button className="btn p" onClick={compartilhar}>Compartilhar convite</button>
        <button className="btn o" onClick={() => copiar(link, 'link')}>Copiar link</button>
        <button className="btn o" onClick={() => copiar(codigo, 'cod')}>Copiar código</button>
      </div>
      <p role="status" style={{ minHeight: 22, color: 'var(--verde-t)' }}>{copiado === 'erro' ? 'Não foi possível copiar.' : copiado ? 'Copiado!' : ''}</p>
      <small style={{ color: 'var(--suave)' }}>Você ganha pontos quando o seu amigo entra e conclui o cadastro.</small>
    </div>
    <section className="card" aria-label="Amigos que você indicou">
      <h3>Quem você indicou</h3>
      {lista.length === 0 ? <p className="vazio" style={{ padding: 16 }}>Ninguém ainda. Compartilhe o seu convite!</p> : lista.map((x, i) => (
        <div className="item" key={i}><span>{x.nome}</span><span className={`tag ${x.concluido ? 'ok' : ''}`}>{x.concluido ? 'Entrou' : 'Falta concluir'}</span></div>
      ))}
    </section>
  </>);
}
