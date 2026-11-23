// Música dos jogos: gerada na hora pelo próprio aparelho (WebAudio), sem arquivos de áudio.
// Cada jogo tem o seu "clima". Liga ao entrar no jogo (toque em Jogar) e a pessoa pode desligar quando quiser.
const CHAVE = 'panthu_musica';

const PRESETS = {
  truco:        { bpm: 98,  raiz: 57, escala: [0, 3, 5, 7, 10], onda: 'triangle', baixo: 'sine',     dens: 0.55, hat: true,  pad: false, vol: 0.9 },
  xadrez:       { bpm: 70,  raiz: 50, escala: [0, 2, 3, 5, 7, 9, 10], onda: 'sine', baixo: 'sine',    dens: 0.32, hat: false, pad: true,  vol: 0.9 },
  memoria:      { bpm: 112, raiz: 60, escala: [0, 2, 4, 7, 9], onda: 'triangle', baixo: 'sine',     dens: 0.65, hat: true,  pad: false, vol: 0.85 },
  paciencia:    { bpm: 80,  raiz: 53, escala: [0, 2, 4, 6, 7, 9, 11], onda: 'sine', baixo: 'sine',   dens: 0.38, hat: false, pad: true,  vol: 0.9 },
  cacapalavras: { bpm: 104, raiz: 55, escala: [0, 2, 4, 7, 9], onda: 'square',   baixo: 'triangle', dens: 0.6,  hat: true,  pad: false, vol: 0.6 },
  impostor:     { bpm: 88,  raiz: 52, escala: [0, 1, 4, 5, 7, 8], onda: 'sawtooth', baixo: 'triangle', dens: 0.4, hat: true, pad: true,  vol: 0.55 }
};

let ctx = null, mestre = null, filtro = null, timer = null;
let jogoAtual = null, preset = null, proximo = 0, passo = 0, idx = 2, inten = 0, tocando = false;
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((f) => { try { f(tocando); } catch {} });

const CHAVE_VOL = 'panthu_musica_vol';
export function volumeMusica() { try { const v = parseFloat(localStorage.getItem(CHAVE_VOL)); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8; } catch { return 0.8; } }
// Regulador de volume (0 a 1): vale na hora, sem reiniciar a música.
export function definirVolumeMusica(v) {
  const x = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(CHAVE_VOL, String(x)); } catch {}
  if (ctx && mestre && tocando && preset) { const t = ctx.currentTime; mestre.gain.cancelScheduledValues(t); mestre.gain.setValueAtTime(mestre.gain.value, t); mestre.gain.linearRampToValueAtTime(alvo(), t + 0.1); }
}
const alvo = () => 0.14 * (preset?.vol ?? 1) * Math.pow(volumeMusica(), 2);

export function musicaLigada() { try { return localStorage.getItem(CHAVE) !== '0'; } catch { return true; } }
export function assinarMusica(f) { ouvintes.add(f); return () => ouvintes.delete(f); }
export function musicaTocando() { return tocando; }

function audio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 2400;
      mestre = ctx.createGain(); mestre.gain.value = 0;
      filtro.connect(mestre); mestre.connect(ctx.destination);
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend?.(); else if (tocando) ctx.resume?.();
      });
    }
    if (ctx.state === 'suspended') ctx.resume?.();
    return ctx;
  } catch { return null; }
}

const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

function nota(m, t, dur, vol, onda) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = onda; o.frequency.value = freq(m);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(filtro);
  o.start(t); o.stop(t + dur + 0.05);
}
function chiado(t, vol) {
  const n = Math.floor(ctx.sampleRate * 0.04), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = vol;
  s.buffer = b; s.connect(f); f.connect(g); g.connect(filtro); s.start(t);
}

function tocarPasso(t) {
  const p = preset, pas = passo % 32, passoDur = 60 / (p.bpm * (1 + inten * 0.22)) / 2;
  // baixo: raiz no 1º tempo, quinta no 3º
  if (pas % 8 === 0) nota(p.raiz - 12, t, passoDur * 3.2, 0.16, p.baixo);
  else if (pas % 8 === 4) nota(p.raiz - 12 + 7, t, passoDur * 2.6, 0.12, p.baixo);
  // pad suave a cada 16 passos
  if (p.pad && pas % 16 === 0) { nota(p.raiz, t, passoDur * 15, 0.05, 'sine'); nota(p.raiz + 7, t, passoDur * 15, 0.04, 'sine'); }
  // melodia: caminhada aleatória na escala (duas oitavas), mais cheia quando a intensidade sobe
  if (Math.random() < Math.min(0.95, p.dens + inten * 0.3)) {
    idx = Math.max(0, Math.min(p.escala.length * 2 - 1, idx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    const grau = p.escala[idx % p.escala.length] + 12 * Math.floor(idx / p.escala.length);
    nota(p.raiz + 12 + grau, t, passoDur * (Math.random() < 0.3 ? 2.4 : 1.3), 0.11, p.onda);
  }
  if (p.hat && pas % 2 === 1) chiado(t, 0.05 + inten * 0.03);
  passo++;
}

function agendar() {
  if (!ctx || !preset) return;
  const lim = ctx.currentTime + 0.35;
  while (proximo < lim) {
    tocarPasso(proximo);
    proximo += 60 / (preset.bpm * (1 + inten * 0.22)) / 2;
  }
}

function comecar() {
  const c = audio(); if (!c || !preset) return;
  clearInterval(timer);
  proximo = c.currentTime + 0.1; passo = 0; idx = 2;
  mestre.gain.cancelScheduledValues(c.currentTime);
  mestre.gain.setValueAtTime(mestre.gain.value, c.currentTime);
  mestre.gain.linearRampToValueAtTime(alvo(), c.currentTime + 1.5);
  timer = setInterval(agendar, 100);
  tocando = true; avisar();
  // alguns celulares só liberam o som no próximo toque
  const d = () => { if (ctx?.state === 'suspended') ctx.resume?.(); };
  window.addEventListener('pointerdown', d, { once: true });
}

export function iniciarMusica(jogo) {
  jogoAtual = jogo; preset = PRESETS[jogo] || PRESETS.memoria; inten = 0;
  if (musicaLigada()) comecar(); else { tocando = false; avisar(); }
}

export function pararMusica(definitivo = true) {
  clearInterval(timer); timer = null;
  if (ctx && mestre) {
    const t = ctx.currentTime;
    mestre.gain.cancelScheduledValues(t); mestre.gain.setValueAtTime(mestre.gain.value, t); mestre.gain.linearRampToValueAtTime(0, t + 0.4);
  }
  tocando = false; if (definitivo) { jogoAtual = null; } avisar();
}

export function definirMusica(ligada) {
  try { localStorage.setItem(CHAVE, ligada ? '1' : '0'); } catch {}
  if (ligada && jogoAtual) comecar(); else if (!ligada) pararMusica(false);
}

// 0 = clima normal, 1 = tensão (mais notas e andamento um pouco mais rápido). Ex.: truco pedido, votação.
export function intensidade(n) { inten = Math.max(0, Math.min(1, n)); }
