'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '../Avatar';
import SalaImpostor from './SalaImpostor';
import { criarCliente } from '@/lib/supabase/client';
import './impostor.css';

const TEMPOS = { dica: [15, 20, 25, 30, 45, 60], disc: [30, 60, 90, 120, 180], vot: [15, 30, 45, 60, 90] };

// Menu do jogo: jogar agora, criar sala, entrar com código, salas abertas, como jogar, desempenho e ranking.
export default function Impostor({ euId, euNome, salaInicial }) {
  const sb = useRef(null);
  const cli = () => (sb.current ||= criarCliente());
  const [codigo, setCodigo] = useState(null);
  const [tela, setTela] = useState('menu');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [atual, setAtual] = useState(null);
  const [convites, setConvites] = useState([]);
  const [publicas, setPublicas] = useState(null);
  const [cats, setCats] = useState([]);
  const [meu, setMeu] = useState(null);
  const [rank, setRank] = useState(null);
  const [digitado, setDigitado] = useState('');

  const rpc = useCallback(async (nome, args) => {
    setMsg(null);
    const { data, error } = await cli().rpc(nome, args);
    if (error) { setMsg(error.message); return { erro: true }; }
    return { data };
  }, []);

  const carregarMenu = useCallback(async () => {
    const [a, c] = await Promise.all([cli().rpc('imp_sala_atual'), cli().rpc('imp_meus_convites')]);
    if (!a.error) setAtual(a.data || null);
    if (!c.error) setConvites(c.data || []);
  }, []);

  useEffect(() => {
    if (salaInicial) { entrar(salaInicial); }
    else carregarMenu();
    const t = setInterval(() => { if (!document.hidden && !codigo) carregarMenu(); }, 8000);
    return () => clearInterval(t);
  }, [salaInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  async function entrar(cod) {
    setOcupado(true);
    const r = await rpc('imp_entrar', { p_codigo: cod });
    setOcupado(false);
    if (!r.erro) { setCodigo(r.data); history.replaceState(null, '', '/app/impostor'); } else carregarMenu();
  }
  async function jogarAgora() { setOcupado(true); const r = await rpc('imp_jogar_agora'); setOcupado(false); if (!r.erro) setCodigo(r.data); }
  async function responder(c, aceitar) {
    const r = await rpc('imp_responder_convite', { p_id: c.id, p_aceitar: aceitar });
    if (aceitar && !r.erro && r.data) setCodigo(r.data); else carregarMenu();
  }
  async function abrirTela(t) {
    setTela(t); setMsg(null);
    if (t === 'salas') { setPublicas(null); const r = await rpc('imp_salas_publicas'); setPublicas(r.data || []); }
    if (t === 'criar' && !cats.length) { const r = await rpc('imp_categorias_lista'); setCats(r.data || []); }
    if (t === 'desempenho') { const r = await rpc('imp_meu_desempenho'); setMeu(r.data || {}); }
    if (t === 'ranking') { const r = await rpc('imp_ranking'); setRank(r.data || []); }
  }

  if (codigo) return <SalaImpostor codigo={codigo} euId={euId} aoSair={() => { setCodigo(null); setTela('menu'); carregarMenu(); }} aoNovaSala={(c) => { setCodigo(null); setTimeout(() => setCodigo(c), 50); }} />;

  return (
    <div className="imp">
      <div className="imp-capa">
        <span className="imp-capa-ico" aria-hidden="true">🕵️</span>
        <h1>Quem é o Impostor?</h1>
        <p>Dê dicas sem entregar a palavra… e descubra quem está fingindo. De 4 a 20 pessoas, direto do celular.</p>
      </div>
      {msg && <p className="msg erro" role="alert">{msg}</p>}
      {atual && tela === 'menu' && <div className="card imp-aviso"><b>Você está em uma partida (sala {atual}).</b><button className="btn ouro" onClick={() => setCodigo(atual)}>Voltar para a sala</button></div>}
      {convites.map((c) => (
        <div className="card imp-aviso" key={c.id} role="alert">
          <b>{c.de_nome} te chamou para “{c.sala_nome}”!</b>
          <span className="linha" style={{ gap: 8 }}><button className="btn p mini" onClick={() => responder(c, true)}>Entrar</button><button className="btn o mini" onClick={() => responder(c, false)}>Agora não</button></span>
        </div>
      ))}

      {tela === 'menu' && (<>
        <div className="imp-botoes">
          <button className="btn ouro grande" disabled={ocupado} onClick={jogarAgora}>⚡ Jogar agora</button>
          <button className="btn p grande" onClick={() => abrirTela('criar')}>➕ Criar sala</button>
          <form className="imp-codigo" onSubmit={(e) => { e.preventDefault(); if (digitado.trim()) entrar(digitado.trim()); }}>
            <input value={digitado} onChange={(e) => setDigitado(e.target.value.toUpperCase())} maxLength={8} placeholder="CÓDIGO" aria-label="Código da sala" autoCapitalize="characters" />
            <button className="btn s" disabled={ocupado || !digitado.trim()}>Entrar com código</button>
          </form>
          <button className="btn o" onClick={() => abrirTela('salas')}>📋 Salas disponíveis</button>
          <button className="btn o" onClick={() => abrirTela('como')}>❓ Como jogar</button>
          <button className="btn o" onClick={() => abrirTela('desempenho')}>📈 Meu desempenho</button>
          <button className="btn o" onClick={() => abrirTela('ranking')}>🏆 Ranking</button>
        </div>
      </>)}

      {tela !== 'menu' && <button className="btn o mini" style={{ margin: '10px 0' }} onClick={() => { setTela('menu'); setMsg(null); }}>← Menu do jogo</button>}

      {tela === 'criar' && <CriarSala cats={cats} aoCriar={async (v) => { setOcupado(true); const r = await rpc('imp_criar_sala', v); setOcupado(false); if (!r.erro) setCodigo(r.data); }} ocupado={ocupado} />}

      {tela === 'salas' && (
        <section className="card"><h2>Salas disponíveis</h2>
          {publicas === null ? <p>Procurando…</p> : publicas.length === 0 ? <p className="vazio">Nenhuma sala pública com vaga agora. Que tal criar uma?</p> : publicas.map((s) => (
            <div className="item" key={s.codigo}><span><b>{s.nome}</b><small>Anfitrião: {s.anfitriao_nome || '—'} · {s.jogadores}/{s.max_jogadores} jogadores</small></span>
              <button className="btn p mini" disabled={ocupado} onClick={() => entrar(s.codigo)}>Entrar</button></div>
          ))}
          <button className="btn o mini" onClick={() => abrirTela('salas')}>↻ Atualizar</button>
        </section>
      )}

      {tela === 'como' && <ComoJogar />}

      {tela === 'desempenho' && (
        <section className="card"><h2>Meu desempenho</h2>
          {!meu ? <p>Carregando…</p> : !meu.stats ? <p className="vazio">Você ainda não terminou nenhuma partida. Bora jogar!</p> : (<>
            <div className="imp-stats">
              {[['Partidas', meu.stats.partidas], ['Pontos', meu.stats.pontos], ['Vitórias como impostor', meu.stats.vit_impostor], ['Vitórias como comum', meu.stats.vit_comum],
                ['Acerto nas votações', meu.stats.votos_total ? `${Math.round((100 * meu.stats.votos_certos) / meu.stats.votos_total)}%` : '—'], ['Melhor sequência', meu.stats.melhor_seq]].map(([n, v]) => <div key={n}><b>{v}</b><small>{n}</small></div>)}
            </div>
            <h3>Últimas partidas</h3>
            {(meu.historico || []).map((h, i) => <div className="item" key={i}><span>{h.venceu ? '🏆 Vitória' : 'Derrota'} como {h.papel === 'impostor' ? 'impostor' : 'jogador comum'}<small>{new Date(h.criado_em).toLocaleDateString('pt-BR')}</small></span><span className="tag ok">+{h.pontos}</span></div>)}
          </>)}
        </section>
      )}

      {tela === 'ranking' && (
        <section className="card"><h2>Ranking</h2>
          {!rank ? <p>Carregando…</p> : rank.length === 0 ? <p className="vazio">Ainda ninguém pontuou.</p> : rank.map((r, i) => (
            <div className="item" key={r.usuario_id}><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><b>{i + 1}º</b><Avatar url={r.foto_url} nome={r.nome} tam={34} /><span>{r.nome}{r.usuario_id === euId ? ' (você)' : ''}<small>{r.partidas} partidas · {r.vitorias} vitórias</small></span></span><span className="tag ok">{r.pontos} pts</span></div>
          ))}
        </section>
      )}
    </div>
  );
}

function CriarSala({ cats, aoCriar, ocupado }) {
  const [f, setF] = useState({ nome: '', publica: false, max: 12, imp: 1, tdica: 25, tdisc: 60, tvot: 30, cats: [] });
  const maxImp = Math.max(1, Math.min(3, Math.floor((f.max - 1) / 2)));
  const imp = Math.min(f.imp, maxImp);
  const alternar = (id) => setF((x) => ({ ...x, cats: x.cats.includes(id) ? x.cats.filter((c) => c !== id) : [...x.cats, id] }));
  return (
    <form className="card imp-form" onSubmit={(e) => { e.preventDefault(); aoCriar({ p_nome: f.nome, p_publica: f.publica, p_max: f.max, p_imp: imp, p_cats: f.cats, p_tdica: f.tdica, p_tdisc: f.tdisc, p_tvot: f.tvot }); }}>
      <h2>Criar sala</h2>
      <label>Nome da sala<input value={f.nome} maxLength={40} placeholder="Ex.: Galera do sábado" onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
      <div className="imp-opcoes" role="group" aria-label="Tipo da sala">
        <button type="button" className={`btn mini ${!f.publica ? 'p' : 'o'}`} aria-pressed={!f.publica} onClick={() => setF({ ...f, publica: false })}>🔒 Privada (só com código)</button>
        <button type="button" className={`btn mini ${f.publica ? 'p' : 'o'}`} aria-pressed={f.publica} onClick={() => setF({ ...f, publica: true })}>🌎 Pública (aparece na lista)</button>
      </div>
      <label>Quantos jogadores (4 a 20): <b>{f.max}</b><input type="range" min="4" max="20" value={f.max} onChange={(e) => setF({ ...f, max: +e.target.value })} /></label>
      <label>Impostores: <b>{imp}</b><input type="range" min="1" max={maxImp} value={imp} onChange={(e) => setF({ ...f, imp: +e.target.value })} disabled={maxImp === 1} /></label>
      <fieldset><legend>Categorias de palavras <small>(nenhuma marcada = todas)</small></legend>
        <div className="chips-lista">{cats.map((c) => <button type="button" key={c.id} className={`chip ${f.cats.includes(c.id) ? 'on' : ''}`} aria-pressed={f.cats.includes(c.id)} onClick={() => alternar(c.id)}>{c.nome}</button>)}</div>
      </fieldset>
      <div className="imp-tempos">
        <label>Tempo da dica<select value={f.tdica} onChange={(e) => setF({ ...f, tdica: +e.target.value })}>{TEMPOS.dica.map((t) => <option key={t} value={t}>{t}s</option>)}</select></label>
        <label>Discussão<select value={f.tdisc} onChange={(e) => setF({ ...f, tdisc: +e.target.value })}>{TEMPOS.disc.map((t) => <option key={t} value={t}>{t}s</option>)}</select></label>
        <label>Votação<select value={f.tvot} onChange={(e) => setF({ ...f, tvot: +e.target.value })}>{TEMPOS.vot.map((t) => <option key={t} value={t}>{t}s</option>)}</select></label>
      </div>
      <button className="btn ouro grande" disabled={ocupado}>Criar sala</button>
    </form>
  );
}

function ComoJogar() {
  return (
    <section className="card"><h2>Como jogar</h2>
      <ol className="imp-como">
        <li><b>Papéis secretos.</b> Quase todos recebem a mesma palavra. O(s) <b>impostor(es)</b> não recebem nada, só o aviso de que são impostores.</li>
        <li><b>Dicas.</b> Cada um, na sua vez, dá uma dica curta sobre a palavra, sem dizê-la. O impostor improvisa para não ser descoberto.</li>
        <li><b>Discussão.</b> Conversem no chat: questionem dicas estranhas, defendam-se, acusem.</li>
        <li><b>Votação secreta.</b> Cada um vota em quem acha que é o impostor (não vale votar em si). Os votos só aparecem no final. Empate → nova votação entre os empatados.</li>
        <li><b>Resultado.</b> Se o impostor sai, os comuns vencem — mas ele ainda tem <b>uma última chance</b> de adivinhar a palavra para ganhar bônus. Se um comum sai, a rodada continua. Se os impostores igualarem os comuns, o impostor vence.</li>
      </ol>
      <h3>Pontos</h3>
      <ul><li>Comum vence: +100 · Impostor vence: +150</li><li>Voto certo: +30 · Última chance certa: +50 · Ficar até o fim: +20</li></ul>
    </section>
  );
}
