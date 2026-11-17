'use client';
import { useEffect, useRef, useState } from 'react';
import Avatar from '../Avatar';
import { criarCliente } from '@/lib/supabase/client';

const NOMES = { xadrez: 'Xadrez', truco: 'Truco', memoria: 'Memória', paciencia: 'Paciência', cacapalavras: 'Caça-palavras' };

// Escolhe um amigo e manda o convite. Quando o convite é criado, devolve { id, sala, jogo } para o painel abrir a sala.
export default function ChamarAmigo({ jogoInicial, aoCriar, fechar }) {
  const sb = useRef(null);
  const cli = () => (sb.current ||= criarCliente());
  const [jogo, setJogo] = useState(jogoInicial || 'xadrez');
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await cli().rpc('pessoas_para_jogar');
      if (error) { setErro('Convites indisponíveis. Rode o arquivo supabase/pontos-favoritos-lgpd.sql no Supabase.'); setLista([]); return; }
      setLista(data || []);
    })();
  }, []);

  async function chamar(p) {
    setEnviando(p.id); setErro('');
    const { data, error } = await cli().rpc('convidar_para_jogar', { p_para: p.id, p_jogo: jogo });
    setEnviando('');
    if (error || !data?.[0]) { setErro(error?.message || 'Não foi possível chamar agora.'); return; }
    aoCriar({ id: data[0].id, sala: data[0].sala, jogo, nome: p.nome });
  }

  return (
    <section className="card" aria-label="Chamar um amigo para jogar">
      <div className="linha"><h3>Chamar um amigo para jogar</h3><button className="btn o mini" onClick={fechar}>Fechar</button></div>
      {!jogoInicial && (
        <div className="j-acoes" role="group" aria-label="Jogo" style={{ justifyContent: 'flex-start', margin: '8px 0' }}>
          {Object.entries(NOMES).map(([k, n]) => <button key={k} className={`btn mini ${jogo === k ? 'p' : 'o'}`} aria-pressed={jogo === k} onClick={() => setJogo(k)}>{n}</button>)}
        </div>
      )}
      <p style={{ color: 'var(--suave)', marginTop: 4 }}>Você joga <b>{NOMES[jogo]}</b> online. O amigo recebe um aviso e entra com um toque.</p>
      {erro && <p className="msg erro" role="alert">{erro}</p>}
      {!lista ? <p className="carregando">Carregando…</p> : lista.length === 0 && !erro ? (
        <p className="vazio" style={{ padding: 16 }}>Você ainda não tem amigos para chamar. Salve amigos no perfil de quem você conhece, ou aceite uma conversa privada.</p>
      ) : lista.map((p) => (
        <div className="item" key={p.id} style={{ alignItems: 'center' }}>
          <span className="lista-item"><Avatar url={p.foto_url} nome={p.nome} tam={40} /><b>{p.nome}</b></span>
          <button className="btn s mini" disabled={!!enviando} onClick={() => chamar(p)}>{enviando === p.id ? 'Chamando…' : 'Chamar'}</button>
        </div>
      ))}
    </section>
  );
}
