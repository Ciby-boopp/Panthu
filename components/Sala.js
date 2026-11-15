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
  const campo = useRef(null);
  const fim = useRef(null);
  const sb = useRef(criarCliente()).current;

  const recarregar = useCallback(async () => {
    const { data } = await sb.rpc('mensagens_sala', { sl: salaId, limite: 100 });
    if (data) setMsgs(data);
  }, [sb, salaId]);

  useEffect(() => {
    const canal = sb.channel(`sala-${salaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `sala_id=eq.${salaId}` }, recarregar)
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
        {msgs.map(m => {
          const meu = m.autor_id === usuarioId;
          return (
            <div key={m.id} className={`linha-msg ${meu ? 'eu' : ''}`}>
              {!meu && <Link href={`/app/pessoa/${m.autor_id}`} aria-label={`Perfil de ${m.autor_nome}`}><Avatar url={m.autor_foto} nome={m.autor_nome} tam={36} /></Link>}
              <div className="msg-col">
                {!meu && <Link href={`/app/pessoa/${m.autor_id}`} className="msg-nome">{m.autor_nome}</Link>}
                <div className={`bolha ${meu ? 'eu' : ''}`}>
                  {m.texto}
                  {m.criado_em && <span className="hora">{hora(m.criado_em)}</span>}
                  {!meu && (den === m.id
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
