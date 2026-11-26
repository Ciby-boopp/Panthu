'use client';
import { useEffect, useRef, useState } from 'react';
import { EFEITOS, definirVoz, destravarAudio, gritar, lerPrefs, salvarPrefs, vozLigada } from '@/lib/efeitosTruco';
import { MAX_MS, apagarGrito, gravacaoSuportada, gravar, salvarGrito, temGrito, tocarGrito, lerGrito } from '@/lib/gritoGravado';
import AlterarSenha from './AlterarSenha';
import { definirSomNotif, somNotifLigado, tocarNotificacao } from '@/lib/somNotificacao';

// Configurações gerais de som: aviso de notificação e o grito de TRUCO (gravado ou com efeito).
export default function Configuracoes() {
  const [notif, setNotif] = useState(true);
  const [voz, setVoz] = useState(true);
  const [zp, setZp] = useState({ efeito: 'normal', sons: true, anim: true, genero: 'auto' });
  const [tem, setTem] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [msg, setMsg] = useState(null);
  const parar = useRef(null);
  useEffect(() => { setNotif(somNotifLigado()); setVoz(vozLigada()); setZp(lerPrefs()); setTem(temGrito()); }, []);
  const mudarZ = (n) => { const novo = { ...zp, ...n }; setZp(novo); salvarPrefs(novo); };

  async function iniciar() {
    setMsg(null);
    if (!gravacaoSuportada()) return setMsg({ t: 'erro', m: 'Este aparelho/navegador não permite gravar áudio. Seu grito continua com a voz e efeitos.' });
    try {
      setGravando(true);
      const url = await gravar((p) => { parar.current = p; });
      if (!salvarGrito(url)) throw new Error('salvar');
      setTem(true); setMsg({ t: 'ok', m: 'Grito salvo! Toque em “Ouvir” para conferir.' });
    } catch (e) {
      setMsg({ t: 'erro', m: e?.name === 'NotAllowedError' ? 'Permita o uso do microfone nas configurações do navegador para gravar.' : e?.message === 'curto' ? 'Não consegui ouvir nada. Fale mais perto e tente de novo.' : 'Não foi possível gravar agora.' });
    } finally { setGravando(false); parar.current = null; }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="card" aria-labelledby="c-notif">
        <h2 id="c-notif" style={{ fontSize: 20 }}>🔔 Som de notificação</h2>
        <p className="j-dica">Toca um “ding-dong” quando chega mensagem, convite ou brinde com o app aberto. (Com o app fechado, quem toca é o som do próprio celular.)</p>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={notif} onChange={(e) => { setNotif(e.target.checked); definirSomNotif(e.target.checked); }} /> Tocar som de notificação</label>
        <button type="button" className="btn o mini" style={{ marginTop: 10 }} onClick={() => tocarNotificacao(true)}>▶ Testar</button>
      </section>

      <section className="card" aria-labelledby="c-grito">
        <h2 id="c-grito" style={{ fontSize: 20 }}>🗣️ Meu grito de TRUCO</h2>
        <p className="j-dica">Grave até {MAX_MS / 1000} segundos gritando “TRUCO!”. No jogo, sua voz grita só o primeiro TRUCO. Se você não gravar, o jogo usa a voz padrão do Panthu. Os pedidos de 6, 9 e 12 sempre usam a voz padrão, e o patinho 🦆 faz só “quá”.</p>
        {gravando
          ? <button type="button" className="btn perigo" onClick={() => parar.current?.()}>⏹ Parar (gravando…)</button>
          : <button type="button" className="btn ouro" onClick={iniciar}>🎙️ {tem ? 'Gravar de novo' : 'Gravar meu grito'}</button>}
        {tem && !gravando && <div className="linha" style={{ marginTop: 10, gap: 8 }}>
          <button type="button" className="btn p mini" onClick={() => tocarGrito(lerGrito())}>▶ Ouvir</button>
          <button type="button" className="btn o mini" onClick={() => { apagarGrito(); setTem(false); setMsg({ t: 'ok', m: 'Gravação apagada. Voltou a voz com efeitos.' }); }}>🗑️ Apagar</button>
          <span className="tag ok">Gravado ✓</span>
        </div>}
        {msg && <p className={`msg ${msg.t}`} role="status" style={{ marginTop: 10 }}>{msg.m}</p>}
        <p className="j-dica" style={{ marginTop: 10 }}>A gravação fica só neste aparelho. Ela só é enviada ao seu oponente, como áudio curto, quando você grita durante uma partida online.</p>
      </section>

      <section className="card" aria-labelledby="c-voz">
        <h2 id="c-voz" style={{ fontSize: 20 }}>🎭 Voz padrão e zoeira (quando não há gravação)</h2>
        <div className="j-zoeira-lista" style={{ display: 'grid', gap: 10 }}>
          <label><input type="checkbox" checked={voz} onChange={(e) => { setVoz(e.target.checked); definirVoz(e.target.checked); }} /> Grito em voz alta</label>
          <label>Voz do grito{' '}
            <select value={zp.genero || 'auto'} onChange={(e) => mudarZ({ genero: e.target.value })} disabled={!voz}>
              <option value="auto">Automática</option><option value="fem">Feminina</option><option value="masc">Masculina</option></select>
          </label>
          <label>Efeito na voz{' '}
            <select value={zp.efeito} onChange={(e) => mudarZ({ efeito: e.target.value })} disabled={!voz}>{EFEITOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
          </label>
          <label><input type="checkbox" checked={zp.sons} onChange={(e) => mudarZ({ sons: e.target.checked })} disabled={!voz} /> Sons de pato e engraçados</label>
          <label><input type="checkbox" checked={zp.anim} onChange={(e) => mudarZ({ anim: e.target.checked })} /> Animações engraçadas</label>
          <button type="button" className="btn o mini" disabled={!voz} onClick={() => { destravarAudio(); gritar('TRUCO!', 'truco'); }}>▶ Testar a voz</button>
        </div>
      </section>
      <AlterarSenha />
    </div>
  );
}
