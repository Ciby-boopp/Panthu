// Aviso de saída de jogador nas partidas online (Truco, Memória, Xadrez, Paciência, Caça-palavras).
// - Saída voluntária: quem sai manda "saiu" no canal antes de fechar.
// - Queda de conexão: a presença do canal some sem o "saiu" → avisa como "perdeu a conexão" (após 4 s de tolerância,
//   para não alarmar à toa em oscilações rápidas de sinal).
// O aviso chega à tela de Jogos por um evento do navegador ('panthu:saida'), uma única vez por pessoa.
const TOLERANCIA_MS = 4000;
const recentes = new Map();

function emitir(p, voluntario) {
  if (typeof window === 'undefined' || !p?.id) return;
  const ant = recentes.get(p.id);
  if (ant && Date.now() - ant < 30000) return; // sem duplicar
  recentes.set(p.id, Date.now());
  window.dispatchEvent(new CustomEvent('panthu:saida', { detail: { id: p.id, nome: p.nome || 'Seu amigo', foto: p.foto || null, voluntario } }));
}

export function ligarPresenca(sb, ch) {
  const e = { eu: null, inscrito: false, trackado: false, vol: new Set(), timers: new Map(), fechado: false };
  const track = () => {
    if (e.fechado || e.trackado || !e.inscrito || !e.eu) return;
    e.trackado = true;
    ch.track({ id: e.eu.id, nome: e.eu.nome, foto: e.eu.foto });
  };
  (async () => {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: p } = await sb.from('perfis').select('nome, foto_url').eq('id', user.id).maybeSingle();
      e.eu = { id: user.id, nome: (p?.nome || '').split(' ')[0] || 'Jogador', foto: p?.foto_url || null };
      track();
    } catch {}
  })();
  ch.on('presence', { event: 'join' }, ({ newPresences }) => {
    (newPresences || []).forEach((p) => { clearTimeout(e.timers.get(p.id)); e.timers.delete(p.id); e.vol.delete(p.id); });
  });
  ch.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    (leftPresences || []).forEach((p) => {
      if (!p?.id || p.id === e.eu?.id || e.vol.has(p.id)) return;
      clearTimeout(e.timers.get(p.id));
      e.timers.set(p.id, setTimeout(() => { e.timers.delete(p.id); if (!e.vol.has(p.id)) emitir(p, false); }, TOLERANCIA_MS));
    });
  });
  ch.on('broadcast', { event: 'saiu' }, ({ payload }) => {
    if (!payload?.id || payload.id === e.eu?.id) return;
    e.vol.add(payload.id); clearTimeout(e.timers.get(payload.id)); e.timers.delete(payload.id);
    emitir(payload, true);
  });
  return {
    aoInscrever() { e.inscrito = true; track(); },
    // Saída voluntária: avisa o outro lado e só então fecha o canal.
    sair() {
      e.fechado = true;
      e.timers.forEach((t) => clearTimeout(t));
      try { if (e.eu) ch.send({ type: 'broadcast', event: 'saiu', payload: e.eu }); } catch {}
      setTimeout(() => { try { sb.removeChannel(ch); } catch {} }, 350);
    },
  };
}
