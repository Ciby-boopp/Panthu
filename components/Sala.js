'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';
import Avatar from './Avatar';
import Icone from './Icone';
import QuebraGelo from './QuebraGelo';
import './chat.css';

const EMOJIS = ['😀', '😂', '😍', '🙂', '😉', '😎', '🤔', '😢', '👍', '👏', '🙏', '🎉', '❤️', '🔥', '🎲', '🍻'];
const hora = (d) => (d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '');

export default function Sala({ salaId, usuarioId, inicial }) {
  const [msgs, setMsgs] = useState(inicial);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState(null);
  const [den, setDen] = useState(null);
  const [gelo, setGelo] = useState(inicial.length === 0);
  const [emoji, setEmoji] = useState(false);
  const [marcas, setMarcas] = useState({}); // id -> { editado_em, apagada }
  const [editando, setEditando] = useState(null); // { id, texto }
  const [apagando, setApagando] = useState(null);
  const campo = useRef(null);
  const fim = useRef(null);
  const sb = useRef(criarCliente()).current;

  // Busca as marcas "editada/apagada". Se o SQL da Etapa 3 ainda não foi rodado, simplesmente não há marcas.
  const carregarMarcas = useCallback(async (lista) => {
    const ids = lista.map((m) => m.id);
    if (!ids.length) return;
    const { data, error } = await sb.rpc('mensagens_marcas', { sl: salaId, ids });
    if (error || !data) return;
    setMarcas((a) => { const n = { ...a }; data.forEach((x) => { n[x.id] = { editado_em: x.editado_em, apagada: x.apagada }; }); return n; });
  }, [sb, salaId]);

  const recarregar = useCallback(async () => {
    const { data } = await sb.rpc('mensagens_sala', { sl: salaId, limite: 100 });
    if (data) { setMsgs(data); carregarMarcas(data); }
  }, [sb, salaId, carregarMarcas]);

  useEffect(() => { carregarMarcas(inicial); }, [carregarMarcas, inicial]);

  useEffect(() => {
    const canal = sb.channel(`sala-${salaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `sala_id=eq.${salaId}` }, recarregar)
      // Edição/exclusão de alguém: atualiza só aquela mensagem, sem recarregar a conversa.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `sala_id=eq.${salaId}` }, (p) => {
        const n = p.new; if (!n?.id) return;
        setMsgs((l) => l.map((m) => (m.id === n.id ? { ...m, texto: n.texto } : m)));
        setMarcas((a) => ({ ...a, [n.id]: { editado_em: n.editado_em, apagada: !!n.apagada } }));
      })
      .subscribe();
    const t = setInterval(recarregar, 15000);
    return () => { sb.removeChannel(canal); clearInterval(t); };
  }, [sb, salaId, recarregar]);

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  function usarSugestao(frase) { setTexto(frase); campo.current?.focus(); }
  function addEmoji(e) { setTexto(t => (t + e).slice(0, 1000)); campo.current?.focus(); }

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setAviso(null); setEmoji(false);
    const { error } = await sb.from('mensagens').insert({ sala_id: salaId, autor_id: usuarioId, texto: t });
    if (error) { setAviso({ t: 'erro', m: 'Não foi possível enviar. Sua conta pode estar sem acesso.' }); return; }
    setTexto(''); recarregar();
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    const t = editando.texto.trim();
    if (!t) return;
    const { error } = await sb.rpc('editar_mensagem', { p_id: editando.id, p_texto: t });
    if (error) { setAviso({ t: 'erro', m: 'Não foi possível editar a mensagem.' }); return; }
    const agora = new Date().toISOString();
    setMsgs((l) => l.map((m) => (m.id === editando.id ? { ...m, texto: t } : m)));
    setMarcas((a) => ({ ...a, [editando.id]: { editado_em: agora, apagada: false } }));
    setEditando(null);
  }

  async function apagar(id) {
    const { error } = await sb.rpc('apagar_mensagem', { p_id: id });
    setApagando(null);
    if (error) { setAviso({ t: 'erro', m: 'Não foi possível apagar a mensagem.' }); return; }
    setMsgs((l) => l.map((m) => (m.id === id ? { ...m, texto: 'Mensagem apagada' } : m)));
    setMarcas((a) => ({ ...a, [id]: { editado_em: null, apagada: true } }));
  }

  async function denunciar(e, id) {
    e.preventDefault();
    const motivo = String(new FormData(e.target).get('motivo'));
    const { error } = await sb.rpc('denunciar_mensagem', { p_msg: id, p_motivo: motivo });
    setDen(null);
    setAviso(error ? { t: 'erro', m: 'Descreva o motivo com pelo menos 5 caracteres.' } : { t: 'ok', m: 'Denúncia enviada. A equipe vai analisar.' });
  }

  return (
    <div className="chat">
      <div className="msgs">
        {msgs.length === 0 && <div className="vazio">Nenhuma mensagem ainda. Puxe o assunto!</div>}
        {msgs.map((m, i) => {
          const meu = m.autor_id === usuarioId;
          const mk = marcas[m.id] || {};
          const apagada = mk.apagada;
          const ant = msgs[i - 1], prox = msgs[i + 1];
          // Mensagens seguidas da mesma pessoa (até 5 min) ficam agrupadas: nome só na primeira, foto só na última.
          const junto = (a, b) => a && b && a.autor_id === b.autor_id && Math.abs(new Date(b.criado_em) - new Date(a.criado_em)) < 5 * 60 * 1000;
          const primeira = !junto(ant, m), ultima = !junto(m, prox);
          const foto = ultima
            ? <Link href={`/app/pessoa/${m.autor_id}`} aria-label={`Perfil de ${m.autor_nome}`}><Avatar url={m.autor_foto} nome={m.autor_nome} tam={32} /></Link>
            : <span style={{ width: 32, flex: 'none' }} aria-hidden="true" />;
          return (
            <div key={m.id} className={`linha-msg ${meu ? 'eu' : ''} ${primeira ? '' : 'junto'}`}>
              {foto}
              <div className="msg-col">
                {!meu && primeira && <Link href={`/app/pessoa/${m.autor_id}`} className="msg-nome">{m.autor_nome}</Link>}
                <div className={`bolha ${meu ? 'eu' : ''} ${apagada ? 'apagada' : ''}`}>
                  {editando?.id === m.id ? (
                    <form onSubmit={salvarEdicao} className="edita">
                      <input value={editando.texto} maxLength={1000} autoFocus aria-label="Editar mensagem" onChange={(e) => setEditando({ id: m.id, texto: e.target.value })} />
                      <button className="btn p mini" disabled={!editando.texto.trim()}>Salvar</button> <button type="button" className="btn o mini" onClick={() => setEditando(null)}>Cancelar</button>
                    </form>
                  ) : (<>
                    {apagada ? <em>🚫 Mensagem apagada</em> : m.texto}
                    <span className="hora">{mk.editado_em && !apagada && <i>Mensagem editada · </i>}{m.criado_em && hora(m.criado_em)}</span>
                  </>)}
                  {meu && !apagada && editando?.id !== m.id && (apagando === m.id
                    ? <div className="acoes-msg">Apagar esta mensagem? <button className="link" onClick={() => apagar(m.id)}>Sim, apagar</button> · <button className="link" onClick={() => setApagando(null)}>Não</button></div>
                    : <div className="acoes-msg"><button className="link" onClick={() => setEditando({ id: m.id, texto: m.texto })}>Editar</button> · <button className="link" onClick={() => setApagando(m.id)}>Apagar</button></div>)}
                  {!meu && !apagada && (den === m.id
                    ? <form onSubmit={(e) => denunciar(e, m.id)} style={{ marginTop: 6 }}>
                        <textarea name="motivo" required minLength={5} maxLength={500} placeholder="Qual o problema com esta mensagem?" />
                        <button className="btn p mini">Enviar denúncia</button> <button type="button" className="btn o mini" onClick={() => setDen(null)}>Cancelar</button>
                      </form>
                    : <div><button className="link" onClick={() => setDen(m.id)}>Denunciar</button></div>)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>
      <QuebraGelo aberto={gelo} aoAlternar={() => setGelo(g => !g)} aoEscolher={usarSugestao} />
      {aviso && <div className={`msg ${aviso.t}`} role="status">{aviso.m}</div>}
      <form className="envio" onSubmit={enviar}>
        <div className="envio-campo">
          <input ref={campo} value={texto} onChange={e => setTexto(e.target.value)} maxLength={1000} placeholder="Digite uma mensagem…" aria-label="Mensagem" />
          <button type="button" className="envio-emoji" aria-label="Escolher emoji" aria-expanded={emoji} onClick={() => setEmoji(v => !v)}><Icone nome="emoji" /></button>
        </div>
        <button className="enviar" aria-label="Enviar mensagem" disabled={!texto.trim()}><Icone nome="enviar" /></button>
        {emoji && (
          <div className="emoji-painel" role="group" aria-label="Emojis">
            {EMOJIS.map(e => <button type="button" key={e} onClick={() => addEmoji(e)} aria-label={`Inserir ${e}`}>{e}</button>)}
          </div>
        )}
      </form>
    </div>
  );
}
