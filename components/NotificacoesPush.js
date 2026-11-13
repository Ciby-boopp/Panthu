'use client';
import { useEffect, useState } from 'react';
import { criarCliente } from '@/lib/supabase/client';

const CHAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
function chaveEmBytes(b64) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function NotificacoesPush() {
  const [sb] = useState(() => criarCliente());
  const [estado, setEstado] = useState('carregando'); // carregando | ok | ios | nao | config
  const [ativo, setAtivo] = useState(false);
  const [negado, setNegado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [prefs, setPrefs] = useState({ previa: true, comunidade: true });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setEstado(ios && !instalado ? 'ios' : 'nao');
      if (!CHAVE) return setEstado('config');
      setNegado(Notification.permission === 'denied');
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = await reg?.pushManager.getSubscription();
        setAtivo(!!sub && Notification.permission === 'granted');
        const { data } = await sb.from('push_prefs').select('previa, comunidade').maybeSingle();
        if (data) setPrefs(data);
      } catch {}
      setEstado('ok');
    })();
  }, [sb]);

  async function ativar() {
    setOcupado(true); setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setNegado(perm === 'denied'); setMsg('Sem permissão, as notificações não podem ser ativadas.'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE) });
      const j = sub.toJSON();
      const { error } = await sb.rpc('salvar_inscricao_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
      if (error) throw error;
      setAtivo(true);
    } catch { setMsg('Não foi possível ativar agora. Tente de novo.'); }
    finally { setOcupado(false); }
  }
  async function desativar() {
    setOcupado(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await sb.from('push_inscricoes').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
      setAtivo(false);
    } catch { setMsg('Não foi possível desativar agora.'); }
    finally { setOcupado(false); }
  }
  async function mudar(campo, valor) {
    const novo = { ...prefs, [campo]: valor };
    setPrefs(novo);
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('push_prefs').upsert({ usuario_id: user.id, ...novo }, { onConflict: 'usuario_id' });
    if (error) { setPrefs(prefs); setMsg('Não foi possível salvar a preferência.'); }
  }

  if (estado === 'carregando' || estado === 'config') return null;
  return (
    <section className="card" aria-label="Notificações no celular">
      <h3>Notificações no celular</h3>
      {estado === 'ios' && <p style={{ color: 'var(--suave)' }}>No iPhone, primeiro abra o Panthu no Safari, toque em <b>Compartilhar</b> e em <b>Adicionar à Tela de Início</b>. Depois abra o app por esse ícone e volte aqui para ativar.</p>}
      {estado === 'nao' && <p style={{ color: 'var(--suave)' }}>Este navegador não permite notificações. Tente no Chrome (Android) ou instale o Panthu na tela inicial.</p>}
      {estado === 'ok' && <>
        <p style={{ color: 'var(--suave)' }}>Receba um aviso com o nome de quem escreveu e um resumo da mensagem, mesmo com o app fechado.</p>
        {negado && <p className="msg erro" role="status">As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador e tente de novo.</p>}
        {ativo
          ? <button className="btn o mini" onClick={desativar} disabled={ocupado}>Desativar neste aparelho</button>
          : <button className="btn p" onClick={ativar} disabled={ocupado || negado}>Ativar notificações</button>}
        {ativo && <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <label><input type="checkbox" checked={prefs.previa} onChange={(e) => mudar('previa', e.target.checked)} />Mostrar prévia da mensagem</label>
          <label><input type="checkbox" checked={prefs.comunidade} onChange={(e) => mudar('comunidade', e.target.checked)} />Avisar sobre mensagens da comunidade</label>
        </div>}
        {msg && <div className="msg erro" role="status">{msg}</div>}
      </>}
    </section>
  );
}
