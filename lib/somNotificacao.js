// Som de notificação dentro do app (aviso de mensagem, convite, brinde…). Sintetizado, sem arquivo de áudio.
const CHAVE = 'panthu_som_notif';
export function somNotifLigado() { try { return localStorage.getItem(CHAVE) !== '0'; } catch { return true; } }
export function definirSomNotif(ligado) { try { localStorage.setItem(CHAVE, ligado ? '1' : '0'); } catch {} }

let ctx = null;
function audio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx ||= new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
// Celulares só liberam som depois de um toque: o app chama isto no primeiro toque.
export function destravarSom() { audio(); }

export function tocarNotificacao(forcar = false) {
  if (!forcar && !somNotifLigado()) return;
  const c = audio(); if (!c) return;
  const t = c.currentTime + 0.01;
  [[880, 0], [1318.5, 0.14]].forEach(([f, d]) => {   // "ding-dong" curto e agradável
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.28, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.45);
    o.connect(g); g.connect(c.destination); o.start(t + d); o.stop(t + d + 0.5);
  });
  try { navigator.vibrate?.([80, 40, 80]); } catch {}
}
