'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';
import Avatar from './Avatar';
import QuebraGelo from './QuebraGelo';
import './chat.css';

export default function Sala({ salaId, usuarioId, inicial }) {
  const [msgs, setMsgs] = useState(inicial);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState(null);
  const [den, setDen] = useState(null);
  const [gelo, setGelo] = useState(inicial.length === 0);
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

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setAviso(null);
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
        {msgs.map(m => (
          <div key={m.id} className={`bolha ${m.autor_id === usuarioId ? 'eu' : ''}`}>
            {m.autor_id !== usuarioId && (
              <Link href={`/app/pessoa/${m.autor_id}`} className="autor"><Avatar url={m.autor_foto} nome={m.autor_nome} tam={22} />{m.autor_nome}</Link>
            )}
            {m.texto}
            {m.autor_id !== usuarioId && (den === m.id
              ? <form onSubmit={(e) => denunciar(e, m.id)} style={{ marginTop: 6 }}>
                  <textarea name="motivo" required minLength={5} maxLength={500} placeholder="Qual o problema com esta mensagem?" />
                  <button className="btn p mini">Enviar denúncia</button> <button type="button" className="btn o mini" onClick={() => setDen(null)}>Cancelar</button>
                </form>
              : <div><button className="link" onClick={() => setDen(m.id)}>Denunciar</button></div>)}
          </div>
        ))}
        <div ref={fim} />
      </div>
      <QuebraGelo aberto={gelo} aoAlternar={() => setGelo(g => !g)} aoEscolher={usarSugestao} />
      {aviso && <div className={`msg ${aviso.t}`} role="status">{aviso.m}</div>}
      <form className="envio" onSubmit={enviar}>
        <input ref={campo} value={texto} onChange={e => setTexto(e.target.value)} maxLength={1000} placeholder="Escreva uma mensagem…" aria-label="Mensagem" />
        <button className="btn p">Enviar</button>
      </form>
    </div>
  );
}
