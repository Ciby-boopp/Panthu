'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from '../Avatar';
import AmigoBotao from '../AmigoBotao';
import { criarCliente } from '@/lib/supabase/client';
import MusicaBotao from '../jogos/MusicaBotao';

const ETAPAS = [['lobby', 'Sala'], ['dicas', 'Dicas'], ['discussao', 'Discussão'], ['votacao', 'Votação'], ['resultado', 'Resultado']];
const ordemEtapa = (s) => (s === 'ultima' ? 4 : s === 'fim' ? 5 : Math.max(0, ETAPAS.findIndex((x) => x[0] === s)));

export default function SalaImpostor({ codigo, euId, aoSair, aoNovaSala }) {
  const sb = useRef(null);
  const cli = () => (sb.current ||= criarCliente());
  const canal = useRef(null);
  const [e, setE] = useState(null);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [offset, setOffset] = useState(0);
  const [, setRel] = useState(0);
  const [texto, setTexto] = useState('');
  const [chat, setChat] = useState('');
  const [chute, setChute] = useState('');
  const [escondido, setEscondido] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [amigos, setAmigos] = useState(null);
  const [convidando, setConvidando] = useState(false);
  const [den, setDen] = useState(null);
  const prazoBuscado = useRef(null);
  const fimChat = useRef(null);

  const buscar = useCallback(async () => {
    const { data, error } = await cli().rpc('imp_estado', { p_codigo: codigo });
    if (error) {
      if (/não está nesta sala|não encontrada/i.test(error.message)) aoSair();
      else setErro('Sem conexão. Tentando de novo…');
      return;
    }
    setErro(null); setE(data); setOffset(new Date(data.agora).getTime() - Date.now());
  }, [codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tempo real: quem age avisa os outros no canal da sala; todos buscam o estado (que só traz o que cada um pode ver).
  useEffect(() => {
    const ch = cli().channel(`imp-${codigo}`, { config: { broadcast: { self: false } } });
    canal.current = ch;
    let t;
    ch.on('broadcast', { event: 'mudou' }, () => { clearTimeout(t); t = setTimeout(buscar, 120); }).subscribe();
    buscar();
    const p = setInterval(() => { if (!document.hidden) buscar(); }, 3000);
    const v = () => { if (!document.hidden) buscar(); };
    document.addEventListener('visibilitychange', v);
    const r = setInterval(() => setRel((n) => n + 1), 500);
    return () => { clearTimeout(t); clearInterval(p); clearInterval(r); document.removeEventListener('visibilitychange', v); cli().removeChannel(ch); };
  }, [codigo, buscar]);

  async function agir(nome, args, ok) {
    setOcupado(true); setAviso(null);
    const { data, error } = await cli().rpc(nome, args);
    setOcupado(false);
    if (error) { setAviso({ erro: true, t: error.message }); return null; }
    canal.current?.send({ type: 'broadcast', event: 'mudou', payload: {} });
    await buscar();
    ok?.(data);
    return data ?? true;
  }

  const restante = e?.prazo ? Math.max(0, Math.ceil((new Date(e.prazo).getTime() - (Date.now() + offset)) / 1000)) : null;
  // Zerou o relógio: pede o estado (o servidor avança a fase).
  useEffect(() => {
    if (restante === 0 && e?.prazo && prazoBuscado.current !== e.prazo) { prazoBuscado.current = e.prazo; setTimeout(buscar, 400); }
  }, [restante, e?.prazo, buscar]);
  useEffect(() => { fimChat.current?.scrollIntoView({ block: 'nearest' }); }, [e?.msgs?.length]);
  useEffect(() => { if (e?.estado === 'fim' && !amigos) cli().rpc('meus_amigos').then(({ data }) => setAmigos(data || [])); }, [e?.estado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!e) return <div className="imp"><p className="card">{erro || 'Entrando na sala…'}</p></div>;

  const J = Object.fromEntries(e.jogadores.map((j) => [j.id, j]));
  const nome = (id) => J[id]?.nome || 'Jogador';
  const eu = J[euId] || {};
  const souHost = e.anfitriao === euId;
  const vivos = e.jogadores.filter((j) => j.vivo && !j.saiu);
  const vezMinha = e.estado === 'dicas' && e.vez === euId;
  const souImpostor = e.meu_papel === 'impostor';
  const euVivo = eu.vivo && !eu.saiu;

  const sair = async () => { await agir('imp_sair', { p_codigo: codigo }); aoSair(); };
  const compartilhar = async () => {
    const url = `${location.origin}/app/impostor?sala=${e.codigo}`;
    try { if (navigator.share) { await navigator.share({ title: 'Quem é o Impostor?', text: `Entre na minha sala (${e.codigo}) no Panthu!`, url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); setAviso({ t: 'Link copiado! Cole no WhatsApp.' }); } catch { setAviso({ t: `Código da sala: ${e.codigo}` }); }
  };
  const abrirConvite = async () => {
    setConvidando((v) => !v);
    if (!amigos) { const { data } = await cli().rpc('meus_amigos'); setAmigos(data || []); }
  };

  return (
    <div className="imp">
      <header className="imp-topo">
        <div><h1>{e.nome}</h1><small>{e.publica ? '🌎 Pública' : '🔒 Privada'} · Rodada {Math.max(e.rodada, 1)}</small></div>
        <button className="imp-cod" onClick={compartilhar} aria-label={`Código ${e.codigo}. Tocar para compartilhar`}><small>CÓDIGO</small><b>{e.codigo}</b></button>
      </header>
      <MusicaBotao jogo="impostor" tensao={e.estado === 'votacao'} />
      <ol className="imp-etapas" aria-label="Etapas da partida">
        {ETAPAS.map(([k, t], i) => <li key={k} className={i < ordemEtapa(e.estado) ? 'feito' : i === ordemEtapa(e.estado) && e.estado !== 'fim' ? 'atual' : ''} aria-current={i === ordemEtapa(e.estado) && e.estado !== 'fim' ? 'step' : undefined}>{t}</li>)}
      </ol>
      {erro && <p className="msg erro" role="status">{erro}</p>}
      {aviso && <p className={`msg ${aviso.erro ? 'erro' : 'ok'}`} role="alert">{aviso.t}</p>}

      {e.estado !== 'lobby' && e.meu_papel && (
        <div className={`imp-papel ${souImpostor ? 'imp' : 'com'}`} key={`p-${e.rodada === 1}`}>
          {escondido ? <b>🙈 Papel escondido</b> : souImpostor
            ? <><small>VOCÊ É O</small><strong>🕵️ IMPOSTOR</strong><span>Descubra a palavra pelas dicas e não seja descoberto!</span></>
            : <><small>A PALAVRA SECRETA É</small><strong>{e.palavra}</strong><span>Dê dicas sem dizê-la e ache o impostor.</span></>}
          <button className="btn o mini" onClick={() => setEscondido((v) => !v)}>{escondido ? 'Mostrar' : 'Esconder'}</button>
        </div>
      )}

      {restante !== null && ['dicas', 'discussao', 'votacao', 'resultado', 'ultima'].includes(e.estado) && (
        <div className={`imp-relogio ${restante <= 5 ? 'urgente' : ''}`} role="timer" aria-label={`${restante} segundos`}>⏱ {restante}s</div>
      )}

      {/* ---------- SALA / LOBBY ---------- */}
      {e.estado === 'lobby' && (
        <section className="card">
          <h2>Jogadores ({e.jogadores.length}/{e.cfg.max})</h2>
          <ul className="imp-lista">
            {e.jogadores.map((j) => (
              <li key={j.id}><span className="imp-av"><Avatar url={j.foto} nome={j.nome} tam={40} /><i className={`ponto ${j.online ? 'on' : ''}`} aria-label={j.online ? 'online' : 'sem sinal'} /></span>
                <b>{j.nome}{j.id === euId ? ' (você)' : ''}</b>{j.id === e.anfitriao && <span className="tag">Anfitrião</span>}
                <span className={`tag ${j.pronto || j.id === e.anfitriao ? 'ok' : ''}`}>{j.pronto || j.id === e.anfitriao ? 'Pronto' : 'Aguardando'}</span></li>
            ))}
          </ul>
          <p className="j-dica">{e.cfg.impostores} impostor(es) · dica {e.cfg.t_dica}s · discussão {e.cfg.t_discussao}s · votação {e.cfg.t_votacao}s</p>
          <div className="imp-acoes">
            {!souHost && <button className={`btn ${eu.pronto ? 'o' : 'ouro'}`} disabled={ocupado} onClick={() => agir('imp_pronto', { p_codigo: codigo, p_pronto: !eu.pronto })}>{eu.pronto ? 'Cancelar “pronto”' : '✅ Estou pronto'}</button>}
            {souHost && <button className="btn ouro grande" disabled={ocupado || e.jogadores.length < 4 || e.jogadores.some((j) => !j.pronto && j.id !== e.anfitriao)} onClick={() => agir('imp_iniciar', { p_codigo: codigo })}>▶ Iniciar partida</button>}
            <button className="btn s" onClick={compartilhar}>📤 Compartilhar convite</button>
            <button className="btn o" onClick={abrirConvite}>👋 Chamar amigos</button>
          </div>
          {souHost && <p className="j-dica">{e.jogadores.length < 4 ? 'Faltam jogadores: são necessários pelo menos 4.' : e.jogadores.some((j) => !j.pronto && j.id !== e.anfitriao) ? 'Aguardando todos ficarem prontos.' : 'Tudo pronto! Pode iniciar.'}</p>}
          {convidando && (
            <div className="imp-amigos">
              {!amigos ? <p>Carregando…</p> : amigos.length === 0 ? <p className="vazio">Você ainda não salvou amigos. Use o botão de compartilhar.</p> : amigos.map((a) => (
                <div className="item" key={a.amigo_id}><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Avatar url={a.foto_url} nome={a.nome} tam={32} />{a.nome}</span>
                  <button className="btn p mini" disabled={J[a.amigo_id]} onClick={() => agir('imp_convidar', { p_codigo: codigo, p_para: a.amigo_id }, () => setAviso({ t: `Convite enviado para ${a.nome}.` }))}>{J[a.amigo_id] ? 'Na sala' : 'Convidar'}</button></div>
              ))}
            </div>
          )}
          <button className="btn perigo mini" style={{ marginTop: 12 }} onClick={sair}>Sair da sala</button>
        </section>
      )}

      {/* ---------- JOGADORES (em jogo) ---------- */}
      {!['lobby', 'fim'].includes(e.estado) && (
        <div className="imp-fichas" aria-label="Jogadores">
          {e.jogadores.filter((j) => !j.saiu).map((j) => (
            <div key={j.id} className={`imp-ficha ${j.vivo ? '' : 'fora'} ${e.vez === j.id && e.estado === 'dicas' ? 'vez' : ''}`}>
              <span className="imp-av"><Avatar url={j.foto} nome={j.nome} tam={42} /><i className={`ponto ${j.online && !j.ausente ? 'on' : ''}`} /></span>
              <small>{j.id === euId ? 'Você' : j.nome.split(' ')[0]}</small>
              {!j.vivo && <em>{j.papel === 'impostor' ? '🕵️' : '❌'}</em>}
            </div>
          ))}
        </div>
      )}

      {/* ---------- DICAS ---------- */}
      {e.estado === 'dicas' && (
        <section className="card">
          <h2>{vezMinha ? '🎤 É a sua vez!' : `Vez de ${nome(e.vez)}`}</h2>
          {vezMinha ? (
            <form className="imp-dica-form" onSubmit={async (ev) => { ev.preventDefault(); if (texto.trim()) { const r = await agir('imp_dica', { p_codigo: codigo, p_texto: texto }); if (r) setTexto(''); } }}>
              <input value={texto} onChange={(ev) => setTexto(ev.target.value)} maxLength={40} placeholder={souImpostor ? 'Improvise uma dica…' : 'Uma dica curta (sem dizer a palavra)'} autoFocus aria-label="Sua dica" />
              <button className="btn ouro" disabled={ocupado || !texto.trim()}>Enviar</button>
            </form>
          ) : <p className="j-dica">Aguarde a dica de {nome(e.vez)}.</p>}
        </section>
      )}
      {['dicas', 'discussao', 'votacao', 'resultado', 'ultima'].includes(e.estado) && <Dicas e={e} nome={nome} />}

      {/* ---------- CHAT (discussão/votação/lobby) ---------- */}
      {['lobby', 'discussao', 'votacao', 'resultado'].includes(e.estado) && (
        <section className="card imp-chat">
          <h3>💬 Conversa</h3>
          <div className="imp-msgs" role="log" aria-live="polite">
            {e.msgs.length === 0 && <p className="j-dica">{e.estado === 'discussao' ? 'Hora de investigar! Questione as dicas suspeitas.' : 'Ninguém falou ainda.'}</p>}
            {e.msgs.map((m) => <p key={m.id} className={m.de === euId ? 'eu' : ''}><b>{m.de === euId ? 'Você' : nome(m.de)}:</b> {m.texto}</p>)}
            <div ref={fimChat} />
          </div>
          {(e.estado === 'lobby' || euVivo) ? (
            <form className="imp-dica-form" onSubmit={async (ev) => { ev.preventDefault(); if (chat.trim()) { const r = await agir('imp_msg', { p_codigo: codigo, p_texto: chat }); if (r) setChat(''); } }}>
              <input value={chat} onChange={(ev) => setChat(ev.target.value)} maxLength={200} placeholder="Escreva aqui…" aria-label="Mensagem" />
              <button className="btn p" disabled={!chat.trim()}>Enviar</button>
            </form>
          ) : <p className="j-dica">Você foi eliminado e só acompanha a conversa.</p>}
        </section>
      )}

      {/* ---------- VOTAÇÃO ---------- */}
      {e.estado === 'votacao' && (
        <section className="card">
          <h2>🗳️ Quem é o impostor?</h2>
          {e.candidatos && <p className="msg ok">Empate! Nova votação só entre os mais votados.</p>}
          {!euVivo ? <p className="j-dica">Você foi eliminado e só acompanha. Votos: {e.votos_n}/{vivos.length}</p>
            : e.votei ? <p className="msg ok" role="status">✅ Voto registrado! Aguardando os outros… ({e.votos_n}/{vivos.length})</p>
            : <div className="imp-votos">{vivos.filter((j) => j.id !== euId && (!e.candidatos || e.candidatos.includes(j.id))).map((j) => (
                <button key={j.id} className="imp-voto" disabled={ocupado} onClick={() => agir('imp_votar', { p_codigo: codigo, p_alvo: j.id })}><Avatar url={j.foto} nome={j.nome} tam={48} /><b>{j.nome}</b><small>Votar</small></button>))}</div>}
          <p className="j-dica">Os votos ficam secretos até o fim da votação.</p>
        </section>
      )}

      {/* ---------- RESULTADO ---------- */}
      {e.estado === 'resultado' && e.resultado && <Resultado e={e} nome={nome} euId={euId} />}

      {/* ---------- ÚLTIMA CHANCE ---------- */}
      {e.estado === 'ultima' && (<>
        {e.resultado && <Resultado e={e} nome={nome} euId={euId} />}
        <section className="card imp-ultima">
          {e.ultimo_eliminado === euId ? (<>
            <h2>Você foi descoberto!</h2><p>Consegue adivinhar a palavra secreta?</p>
            <form className="imp-dica-form" onSubmit={async (ev) => { ev.preventDefault(); if (chute.trim()) await agir('imp_chute', { p_codigo: codigo, p_palavra: chute }); }}>
              <input value={chute} onChange={(ev) => setChute(ev.target.value)} maxLength={40} placeholder="A palavra é…" autoFocus aria-label="Seu palpite" />
              <button className="btn ouro" disabled={ocupado || !chute.trim()}>Arriscar</button>
            </form><p className="j-dica">Só uma tentativa. Acertando, você ganha +50 pontos de bônus.</p>
          </>) : <><h2>🕵️ Última chance</h2><p>{nome(e.ultimo_eliminado)} foi descoberto e tem uma única tentativa de adivinhar a palavra…</p></>}
        </section>
      </>)}

      {/* ---------- FIM ---------- */}
      {e.estado === 'fim' && <Fim e={e} euId={euId} J={J} nome={nome} amigos={amigos} agir={agir} sair={() => aoSair()} aoNovaSala={aoNovaSala} den={den} setDen={setDen} codigo={codigo} setAviso={setAviso} cli={cli} />}

      {!['lobby', 'fim'].includes(e.estado) && <button className="btn perigo mini" style={{ marginTop: 10 }} onClick={() => { if (confirm('Sair da partida? Você perde os pontos desta partida.')) sair(); }}>Sair da partida</button>}
    </div>
  );
}

function Dicas({ e, nome }) {
  const rodadas = [...new Set(e.dicas.map((d) => d.rodada))];
  if (!rodadas.length) return null;
  return (
    <section className="card"><h3>📝 Dicas</h3>
      {rodadas.map((r) => (
        <div key={r} className="imp-dicas">{rodadas.length > 1 && <small>Rodada {r}</small>}
          {e.dicas.filter((d) => d.rodada === r).map((d, i) => <p key={i} className={d.texto.startsWith('(') ? 'vazia' : ''}><b>{nome(d.id)}:</b> {d.texto}</p>)}</div>
      ))}
    </section>
  );
}

function Resultado({ e, nome, euId }) {
  const r = e.resultado;
  const votos = r.votos || [];
  const contagem = votos.reduce((m, v) => ({ ...m, [v.para]: (m[v.para] || 0) + 1 }), {});
  return (
    <section className={`card imp-resultado ${r.tipo === 'eliminado' ? (r.era_impostor ? 'acerto' : 'erro') : ''}`}>
      {r.tipo === 'eliminado' ? (<>
        <h2>{nome(r.eliminado)}{r.eliminado === euId ? ' (você)' : ''} foi eliminado!</h2>
        <p className="imp-revela">{r.era_impostor ? '🕵️ Era um IMPOSTOR!' : '😬 Era um jogador comum…'}</p>
      </>) : <h2>Ninguém foi eliminado</h2>}
      <small>Votos revelados</small>
      <ul className="imp-votos-rev">{Object.entries(contagem).sort((a, b) => b[1] - a[1]).map(([id, n]) => <li key={id}><b>{nome(id)}</b> {n} voto(s) <small>({votos.filter((v) => v.para === id).map((v) => nome(v.de).split(' ')[0]).join(', ')})</small></li>)}</ul>
    </section>
  );
}

function Fim({ e, euId, J, nome, amigos, agir, sair, aoNovaSala, den, setDen, codigo, setAviso, cli }) {
  const eu = J[euId] || {};
  const venceu = (e.vencedor === 'comuns' && eu.papel === 'comum') || (e.vencedor === 'impostores' && eu.papel === 'impostor');
  const cancelada = e.vencedor === 'cancelada';
  const amigoIds = new Set((amigos || []).map((a) => a.amigo_id));
  const [pedidos, setPedidos] = useState({});
  async function revanche() {
    const c = e.proxima_sala || (await agir('imp_revanche', { p_codigo: codigo }));
    if (typeof c === 'string') { if (e.proxima_sala) { const r = await agir('imp_entrar', { p_codigo: c }); if (!r) return; } aoNovaSala(c); }
  }
  async function pedirConversa(id) {
    const { error } = await cli().rpc('pedir_conversa', { outro: id });
    setPedidos((p) => ({ ...p, [id]: error ? 'erro' : 'ok' }));
  }
  async function denunciar(ev, id) {
    ev.preventDefault();
    const motivo = new FormData(ev.target).get('motivo');
    const { error } = await cli().rpc('imp_denunciar', { p_codigo: codigo, p_alvo: id, p_motivo: motivo });
    setAviso(error ? { erro: true, t: error.message } : { t: 'Denúncia enviada. Obrigado por ajudar a comunidade.' });
    setDen(null);
  }
  return (<>
    <section className={`card imp-fim ${cancelada ? '' : venceu ? 'venceu' : 'perdeu'}`}>
      <div className="imp-fim-ico" aria-hidden="true">{cancelada ? '🤝' : venceu ? '🏆' : '😵'}</div>
      <h2>{cancelada ? 'Partida encerrada' : venceu ? 'Você venceu!' : 'Você perdeu…'}</h2>
      <p>{cancelada ? 'Faltou gente para continuar. Ninguém ganhou ou perdeu pontos.' : e.vencedor === 'comuns' ? 'Os jogadores comuns descobriram o impostor!' : 'Os impostores enganaram a todos!'}</p>
      {!cancelada && <p className="imp-pts">+{eu.pontos ?? 0} pontos</p>}
      {e.palavra && <p>A palavra era <b>{e.palavra}</b>.{e.chute && <> O impostor chutou “{e.chute}” {e.chute_ok ? '— e ACERTOU! 🎯' : '— e errou.'}</>}</p>}
      <ul className="imp-lista">{[...e.jogadores].filter((j) => !j.saiu || j.papel).sort((a, b) => (b.pontos ?? 0) - (a.pontos ?? 0)).map((j) => (
        <li key={j.id}><Avatar url={j.foto} nome={j.nome} tam={36} /><b>{j.nome}{j.id === euId ? ' (você)' : ''}</b><span className="tag">{j.papel === 'impostor' ? '🕵️ Impostor' : 'Comum'}</span><span className="tag ok">{j.pontos ?? 0} pts</span></li>))}</ul>
    </section>

    <section className="card imp-social">
      <h2>Gostou de jogar com essas pessoas?</h2>
      {e.jogadores.filter((j) => j.id !== euId && !j.saiu).map((j) => (
        <div className="imp-social-item" key={j.id}>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar url={j.foto} nome={j.nome} tam={40} /><b>{j.nome}</b></span>
          <div className="imp-acoes">
            <Link className="btn o mini" href={`/app/pessoa/${j.id}`}>Ver perfil</Link>
            {amigos && <AmigoBotao id={j.id} euId={euId} inicial={amigoIds.has(j.id)} />}
            <button className="btn s mini" disabled={pedidos[j.id] === 'ok'} onClick={() => pedirConversa(j.id)}>{pedidos[j.id] === 'ok' ? 'Pedido enviado ✓' : '✉️ Conversar'}</button>
            <button className="btn o mini" onClick={() => setDen(den === j.id ? null : j.id)}>🚩 Denunciar</button>
          </div>
          {den === j.id && <form onSubmit={(ev) => denunciar(ev, j.id)} className="imp-dica-form"><input name="motivo" required minLength={5} maxLength={500} placeholder="Qual foi o problema?" /><button className="btn p mini">Enviar</button></form>}
        </div>
      ))}
      <div className="imp-acoes" style={{ marginTop: 14 }}>
        <button className="btn ouro grande" onClick={revanche}>{e.proxima_sala ? '🔁 Entrar na nova sala' : '🔁 Jogar de novo com o mesmo grupo'}</button>
        <Link className="btn s" href="/app/chat">💬 Voltar à comunidade</Link>
        <button className="btn o" onClick={sair}>Menu do jogo</button>
      </div>
    </section>
  </>);
}
