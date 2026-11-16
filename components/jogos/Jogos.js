'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Blackjack from './Blackjack';
import Memoria from './Memoria';
import Truco from './Truco';
import Paciencia from './Paciencia';
import Placar from './Placar';
import Carta from './Carta';
import ChamarAmigo from './ChamarAmigo';
import RankingGeral from './RankingGeral';
import { salvarPartida } from '@/lib/placar';
import { criarCliente } from '@/lib/supabase/client';

const JOGOS = [
  { id: 'blackjack', nome: 'Blackjack', desc: 'Chegue o mais perto de 21 sem estourar.', Comp: Blackjack, c: { v: 'A', n: '♠' } },
  { id: 'memoria', nome: 'Memória', desc: 'Encontre os pares de cartas. Também online com um amigo.', Comp: Memoria, c: { v: 'Q', n: '♥' }, online: true },
  { id: 'truco', nome: 'Truco', desc: 'Truco paulista contra o computador ou online.', Comp: Truco, c: { v: '4', n: '♣' }, online: true },
  { id: 'paciencia', nome: 'Paciência', desc: 'O clássico Klondike, de 1 a 2 jogadores.', Comp: Paciencia, c: { v: 'K', n: '♦' } },
];
const NOME = { truco: 'Truco', memoria: 'Memória' };

export default function Jogos({ conviteId = null }) {
  const sb = useRef(null);
  const cli = () => (sb.current ||= criarCliente());
  const [id, setId] = useState(null);
  const [modo, setModo] = useState('solo');
  const [chave, setChave] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [atualizar, setAtualizar] = useState(0);
  const [partida, setPartida] = useState(null); // { jogo, sala, seat, convite, nome }
  const [chamar, setChamar] = useState(null); // false | true | 'truco' | 'memoria'
  const [espera, setEspera] = useState(null); // convite enviado, aguardando resposta
  const [recebidos, setRecebidos] = useState([]);
  const jogo = JOGOS.find((j) => j.id === (partida ? partida.jogo : id));

  const carregarConvites = useCallback(async () => {
    const { data: ls } = await cli().from('jogos_convites').select('id').eq('status', 'pendente').gt('criado_em', new Date(Date.now() - 10 * 60 * 1000).toISOString());
    if (!ls) return;
    const det = await Promise.all(ls.map(async (c) => (await cli().rpc('ver_convite', { p_id: c.id })).data?.[0]));
    const { data: { user } } = await cli().auth.getUser();
    setRecebidos(det.filter((c) => c && c.para === user.id && !c.expirado));
  }, []);
  useEffect(() => { carregarConvites(); }, [carregarConvites, conviteId]);
  // Atualiza a lista de convites enquanto a tela está aberta.
  useEffect(() => { if (partida) return; const t = setInterval(carregarConvites, 8000); return () => clearInterval(t); }, [carregarConvites, partida]);

  // Quem chamou fica olhando se o amigo aceitou, recusou ou se o convite expirou.
  useEffect(() => {
    if (!espera) return;
    const t = setInterval(async () => {
      const c = (await cli().rpc('ver_convite', { p_id: espera.id })).data?.[0];
      if (!c) return;
      if (c.status === 'recusado') { setPartida(null); setEspera(null); setAviso({ erro: true, t: `${espera.nome} não pôde jogar agora.` }); }
      else if (c.status === 'cancelado' || c.expirado && c.status === 'pendente') { setPartida(null); setEspera(null); setAviso({ erro: true, t: 'O convite expirou. Chame de novo.' }); }
      else if (c.status === 'aceito') setEspera(null);
    }, 3000);
    return () => clearInterval(t);
  }, [espera]);

  const salvar = useCallback(async (r) => {
    const { erro } = await salvarPartida({ jogo: partida ? partida.jogo : id, modo: partida ? 'dois' : modo, ...r });
    setAviso(erro ? { erro: true, t: 'Não consegui salvar a pontuação (rode supabase/jogos.sql no Supabase).' } : { erro: false, t: 'Pontuação salva!' });
    setAtualizar((x) => x + 1);
  }, [id, modo, partida]);

  const escolher = (j) => { setId(j); setAviso(null); setChave((c) => c + 1); };
  const trocarModo = (m) => { setModo(m); setAviso(null); setChave((c) => c + 1); };
  const sair = async () => {
    if (espera) await cli().rpc('responder_convite', { p_id: espera.id, p_acao: 'cancelar' });
    setPartida(null); setEspera(null); setId(null); setAviso(null); carregarConvites();
  };
  const abrirSala = (c) => { setChamar(null); setPartida({ jogo: c.jogo, sala: c.sala, seat: 0, convite: c.id, nome: c.nome }); setEspera({ id: c.id, nome: c.nome }); setAviso(null); };
  async function responder(c, acao) {
    const { data, error } = await cli().rpc('responder_convite', { p_id: c.id, p_acao: acao });
    if (error) { setAviso({ erro: true, t: error.message }); carregarConvites(); return; }
    if (acao === 'aceitar' && data?.[0]) { setPartida({ jogo: data[0].jogo, sala: data[0].sala, seat: 1, convite: c.id, nome: c.de_nome }); setAviso(null); }
    else carregarConvites();
  }

  if (!jogo) {
    return (
      <>
        {recebidos.map((c) => (
          <div className="card convite" key={c.id} role="alert">
            <b>{c.de_nome} te chamou para jogar {NOME[c.jogo]}!</b>
            <div className="j-acoes" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
              <button className="btn p mini" onClick={() => responder(c, 'aceitar')}>Aceitar e jogar</button>
              <button className="btn o mini" onClick={() => responder(c, 'recusar')}>Agora não</button>
            </div>
          </div>
        ))}
        {aviso && <p className={`msg ${aviso.erro ? 'erro' : 'ok'}`} role="status">{aviso.t}</p>}
        <div className="j-acoes" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
          <button className="btn ouro" onClick={() => setChamar(true)}>👋 Chamar um amigo para jogar</button>
          <Link className="btn s" href="/app/pontos">Meus pontos</Link>
        </div>
        {chamar && <ChamarAmigo jogoInicial={chamar === true ? null : chamar} aoCriar={abrirSala} fechar={() => setChamar(null)} />}
        <div className="grade-eventos" style={{ marginTop: 18 }}>
          {JOGOS.map((j) => (
            <button key={j.id} className="card j-card" onClick={() => escolher(j.id)}>
              <Carta c={j.c} largura="58px" />
              <span><b>{j.nome}</b><small>{j.desc}</small></span>
            </button>
          ))}
        </div>
        <RankingGeral atualizar={atualizar} />
      </>
    );
  }
  const Comp = jogo.Comp;
  const rotuloDois = jogo.id === 'truco' ? '2 jogadores (online)' : '2 jogadores (mesmo aparelho)';
  return (
    <>
      <div className="linha" style={{ margin: '12px 0' }}>
        <button className="btn o mini" onClick={sair}>← Jogos</button>
        <h2 style={{ fontSize: 24 }}>{jogo.nome}{partida ? ` com ${partida.nome || 'amigo'}` : ''}</h2>
        {!partida && <span className="j-modos" role="group" aria-label="Modo de jogo">
          <button className={`btn mini ${modo === 'solo' ? 'p' : 'o'}`} aria-pressed={modo === 'solo'} onClick={() => trocarModo('solo')}>1 jogador</button>
          <button className={`btn mini ${modo === 'dois' ? 'p' : 'o'}`} aria-pressed={modo === 'dois'} onClick={() => trocarModo('dois')}>{rotuloDois}</button>
        </span>}
        {!partida && jogo.online && <button className="btn ouro mini" onClick={() => setChamar(jogo.id)}>👋 Chamar amigo</button>}
      </div>
      {chamar && !partida && <ChamarAmigo jogoInicial={chamar} aoCriar={abrirSala} fechar={() => setChamar(null)} />}
      {partida && espera && <p className="msg ok" role="status">Convite enviado para {partida.nome}. A sala abre quando ele aceitar (vale por 10 minutos).</p>}
      <Comp key={partida ? `${partida.jogo}-${partida.sala}-${partida.seat}` : `${id}-${modo}-${chave}`} modo={partida ? 'dois' : modo} aoTerminar={salvar} auto={partida ? { sala: partida.sala, seat: partida.seat } : undefined} />
      {aviso && <p className={`msg ${aviso.erro ? 'erro' : 'ok'}`} role="status">{aviso.t}</p>}
      <Placar jogo={jogo.id} atualizar={atualizar} />
    </>
  );
}
