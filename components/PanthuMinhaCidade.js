'use client';
import { useRef, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

// Cartão do Início: "Ainda não tem o Panthu na sua cidade?" -> abre uma mensagem pronta e envia ao suporte.
export default function PanthuMinhaCidade() {
  const sb = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [cidade, setCidade] = useState('');
  const [env, setEnv] = useState(false);
  const [msg, setMsg] = useState(null);

  async function enviar(e) {
    e.preventDefault(); setEnv(true); setMsg(null);
    const c = cidade.trim();
    const texto = 'Quero ter o Panthu na minha cidade.' + (c ? ` Minha cidade: ${c}.` : '');
    const { error } = await (sb.current ||= criarCliente()).from('suporte_tickets').insert({ assunto: 'Quero o Panthu na minha cidade', mensagem: texto });
    setEnv(false);
    if (error) setMsg({ t: 'erro', m: 'Não foi possível enviar agora. Tente de novo em instantes.' });
    else { setMsg({ t: 'ok', m: 'Mensagem enviada ao suporte! Obrigada por pedir o Panthu na sua cidade 💚' }); setCidade(''); }
  }

  return (<>
    <button type="button" className="ini-cidade" onClick={() => { setAberto(true); setMsg(null); }}>
      <span aria-hidden="true">📍</span>
      <span><b>Ainda não tem o Panthu na sua cidade?</b><small>Toque aqui e peça para a gente chegar até você.</small></span>
    </button>
    {aberto && (
      <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Pedir o Panthu na sua cidade" onClick={(e) => { if (e.target === e.currentTarget) setAberto(false); }}>
        <form className="card modal-caixa" onSubmit={enviar}>
          <h2 style={{ marginTop: 0 }}>Panthu na minha cidade</h2>
          <p style={{ color: 'var(--suave)' }}>Esta mensagem vai direto para o nosso suporte:</p>
          <blockquote className="ini-cidade-msg">“Quero ter o Panthu na minha cidade”</blockquote>
          <div className="campo"><label htmlFor="pc-cid">Qual é a sua cidade? (opcional)</label><input id="pc-cid" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={80} placeholder="Ex.: Campinas - SP" /></div>
          {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {msg?.t !== 'ok' && <button className="btn p" disabled={env}>{env ? 'Enviando…' : 'Enviar ao suporte'}</button>}
            <button type="button" className="btn" onClick={() => setAberto(false)}>{msg?.t === 'ok' ? 'Fechar' : 'Cancelar'}</button>
          </div>
        </form>
      </div>
    )}
  </>);
}
