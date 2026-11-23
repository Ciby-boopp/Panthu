'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import Avatar from '../Avatar';
import Icone from '../Icone';

const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

// Sala de um grupo temático: a pessoa entra para conversar sobre aquele assunto.
export default function SalaTema({ grupo, usuarioId, participaInicial, membrosInicial }) {
  const router = useRouter();
  const sb = useRef(null);
  const getSb = useCallback(() => (sb.current ||= criarCliente()), []);
  const [participa, setParticipa] = useState(participaInicial);
  const [membros, setMembros] = useState(membrosInicial);
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState(null);
  const [env, setEnv] = useState(false);
  const fim = useRef(null);

  const carregar = useCallback(async () => {
    const { data } = await getSb().rpc('grupo_mensagens', { p_grupo: grupo.id, p_limite: 100 });
    if (data) setMsgs(data);
    getSb().rpc('grupo_marcar_lido', { p_grupo: grupo.id });
  }, [getSb, grupo.id]);

  useEffect(() => {
    if (!participa) return;
    carregar();
    const canal = getSb().channel(`tema-${grupo.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos_msgs', filter: `grupo_id=eq.${grupo.id}` }, () => carregar())
      .subscribe();
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 20000);
    return () => { clearInterval(t); getSb().removeChannel(canal); };
  }, [participa, carregar, getSb, grupo.id]);

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  async function entrar() {
    setAviso(null);
    const { error } = await getSb().rpc('grupo_entrar', { p_grupo: grupo.id });
    if (error) { setAviso({ t: 'erro', m: 'Não foi possível entrar agora.' }); return; }
    setParticipa(true); setMembros((n) => n + 1);
  }
  async function excluirGrupo() {
    if (!window.confirm(`Excluir o grupo “${grupo.nome}” para todos? As mensagens serão apagadas.`)) return;
    const { error } = await getSb().rpc('grupo_excluir', { p_grupo: grupo.id });
    if (error) { setAviso({ t: 'erro', m: 'Não foi possível excluir agora.' }); return; }
    router.push('/app/chat'); router.refresh();
  }
  async function sair() {
    await getSb().rpc('grupo_sair', { p_grupo: grupo.id });
    setParticipa(false); setMembros((n) => Math.max(0, n - 1)); setMsgs([]);
  }
  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || env) return;
    setEnv(true); setAviso(null);
    const { error } = await getSb().from('grupos_msgs').insert({ grupo_id: grupo.id, texto: t });
    setEnv(false);
    if (error) setAviso({ t: 'erro', m: 'Não foi possível enviar agora.' }); else { setTexto(''); carregar(); }
  }
  async function apagar(id) {
    const { error } = await getSb().from('grupos_msgs').delete().eq('id', id);
    if (!error) setMsgs((l) => l.filter((m) => m.id !== id));
  }

  return (<>
    <header className="sala-cab">
      <Link href="/app/chat" className="sala-voltar" aria-label="Voltar para as conversas"><Icone nome="voltar" /></Link>
      <span className="sala-cab-ico" aria-hidden="true" style={{ fontSize: 22 }}>{grupo.emoji}</span>
      <div><h1>{grupo.nome}</h1><small>{membros} {membros === 1 ? 'pessoa' : 'pessoas'} no grupo</small></div>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {participa && <button type="button" className="btn o mini" onClick={sair}>Sair do grupo</button>}
        {grupo.podeExcluir && <button type="button" className="btn perigo mini" onClick={excluirGrupo}>Excluir</button>}
      </span>
    </header>
    {!participa ? (
      <div className="card" style={{ margin: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }} aria-hidden="true">{grupo.emoji}</div>
        <h2 style={{ marginTop: 4 }}>{grupo.nome}</h2>
        <p style={{ color: 'var(--suave)' }}>{grupo.descricao}</p>
        {aviso && <div className={`msg ${aviso.t}`} role="status">{aviso.m}</div>}
        <button type="button" className="btn p" onClick={entrar}>Entrar no grupo</button>
        <p style={{ color: 'var(--suave)', fontSize: 13 }}>Seja gentil: mensagens podem ser denunciadas ao suporte.</p>
      </div>
    ) : (
      <div className="chat">
        <div className="msgs">
          {msgs.length === 0 && <div className="vazio">Ninguém falou ainda. Puxe o assunto!</div>}
          {msgs.map((m, i) => {
            const meu = m.autor_id === usuarioId;
            const primeira = i === 0 || msgs[i - 1].autor_id !== m.autor_id;
            return (
              <div key={m.id} className={`linha-msg ${meu ? 'eu' : ''} ${primeira ? '' : 'junto'}`}>
                {primeira
                  ? <Link href={`/app/pessoa/${m.autor_id}`} aria-label={`Perfil de ${m.nome}`}><Avatar url={m.foto_url} nome={m.nome} tam={32} /></Link>
                  : <span style={{ width: 32, flex: 'none' }} aria-hidden="true" />}
                <div className="msg-col">
                  {!meu && primeira && <Link href={`/app/pessoa/${m.autor_id}`} className="msg-nome">{m.nome}</Link>}
                  <div className={`bolha ${meu ? 'eu' : ''}`}>
                    {m.texto}
                    <span className="hora">{hora(m.criado_em)}</span>
                  </div>
                  {meu && <div className="acoes-msg"><button type="button" className="link" onClick={() => apagar(m.id)}>Apagar</button></div>}
                </div>
              </div>
            );
          })}
          <div ref={fim} />
        </div>
        {aviso && <div className={`msg ${aviso.t}`} role="status">{aviso.m}</div>}
        <form className="envio" onSubmit={enviar}>
          <div className="envio-campo">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} placeholder="Digite uma mensagem…" aria-label="Mensagem" />
          </div>
          <button className="enviar" aria-label="Enviar mensagem" disabled={!texto.trim() || env}><Icone nome="enviar" /></button>
        </form>
      </div>
    )}
  </>);
}
