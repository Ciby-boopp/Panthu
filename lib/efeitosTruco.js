// Zoeira do Truco: efeitos na voz do grito, sons de pato e sons engraçados (tudo sintetizado no próprio aparelho,
// sem arquivos de áudio e sem microfone). As escolhas ficam salvas só neste aparelho.
// Observação técnica: o navegador não deixa processar a voz falada (speechSynthesis) com filtros de áudio,
// então os efeitos de voz são aproximados com tom/velocidade da fala + sons sintetizados junto.
const CHAVE = 'panthu_truco_zoeira';
const CHAVE_MUDO = 'panthu_grito_mudo'; // já existia: "grito em voz alta" ligado/desligado

export const EFEITOS = [
  ['normal', 'Normal'], ['grave', 'Voz grave'], ['agudo', 'Voz aguda'], ['megafone', 'Megafone'],
  ['robo', 'Distorcida'], ['eco', 'Eco'], ['pato', 'Pato 🦆'],
];
const PADRAO = { efeito: 'normal', sons: true, anim: true };

export function lerPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    return { efeito: EFEITOS.some((e) => e[0] === p.efeito) ? p.efeito : PADRAO.efeito, sons: p.sons !== false, anim: p.anim !== false };
  } catch { return { ...PADRAO }; }
}
export function salvarPrefs(p) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch {} }
export function vozLigada() { try { return localStorage.getItem(CHAVE_MUDO) !== '1'; } catch { return true; } }
export function definirVoz(ligada) { try { localStorage.setItem(CHAVE_MUDO, ligada ? '0' : '1'); } catch {} }
export function reduzMovimento() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } }

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
// Os celulares só liberam som depois de um toque: chame num clique/toque na mesa.
export function destravarAudio() { audio(); }

function env(g, t0, dur, vol) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}
function quack(c, t0, f0 = 500, dur = 0.17, vol = 0.32) {
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t0 + dur);
  f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2.2;
  env(g, t0, dur, vol);
  o.connect(f); f.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
}
function boing(c, t0) {
  const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(620, t0 + 0.35);
  lfo.frequency.value = 22; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
  env(g, t0, 0.4, 0.3); o.connect(g); g.connect(c.destination);
  o.start(t0); lfo.start(t0); o.stop(t0 + 0.42); lfo.stop(t0 + 0.42);
}
function trombone(c, t0) {
  [[311, 0], [293, 0.32], [277, 0.64], [233, 0.96]].forEach(([f, d], i) => {
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0 + d);
    if (i === 3) o.frequency.linearRampToValueAtTime(f * 0.82, t0 + d + 0.7);
    lp.type = 'lowpass'; lp.frequency.value = 900;
    env(g, t0 + d, i === 3 ? 0.7 : 0.3, 0.22);
    o.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t0 + d); o.stop(t0 + d + (i === 3 ? 0.72 : 0.32));
  });
}
function chiado(c, t0, dur = 0.18, vol = 0.2) { // "estalo" de megafone
  const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8; env(g, t0, dur, vol);
  s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0);
}
function zumbido(c, t0) { // rosnado grave para a voz distorcida
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(90, t0); o.frequency.linearRampToValueAtTime(60, t0 + 0.4);
  env(g, t0, 0.4, 0.12); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.42);
}

export function somPato(n = 2) {
  const c = audio(); if (!c) return;
  const t = c.currentTime + 0.02;
  for (let i = 0; i < n; i++) quack(c, t + i * 0.24, 470 + Math.random() * 130, 0.17);
}

const FALA = { // tom (pitch) e velocidade (rate) da fala por efeito
  normal: { pitch: 1.5, rate: 1.15 }, grave: { pitch: 0.1, rate: 0.75 }, agudo: { pitch: 2, rate: 1.35 },
  megafone: { pitch: 0.7, rate: 0.95 }, robo: { pitch: 0.2, rate: 1.5 }, eco: { pitch: 1.2, rate: 1.0 },
};

// Voz padrão do Panthu: a melhor voz em português do Brasil que o aparelho tiver (ou a padrão do aparelho).
let vozPt = null;
function escolherVoz() {
  try {
    const vs = window.speechSynthesis.getVoices() || [];
    if (!vs.length) return null;
    if (vozPt && vs.includes(vozPt)) return vozPt;
    const pt = vs.filter((v) => /^pt[-_]BR/i.test(v.lang));
    const pref = ['google português do brasil', 'luciana', 'felipe', 'antonio', 'daniel', 'francisca', 'thalita'];
    vozPt = pref.map((n) => pt.find((v) => v.name.toLowerCase().includes(n))).find(Boolean) || pt[0] || null;
    return vozPt;
  } catch { return null; }
}
if (typeof window !== 'undefined' && window.speechSynthesis) { try { window.speechSynthesis.addEventListener('voiceschanged', () => { vozPt = null; escolherVoz(); }); } catch {} }

// Grito: voz com o efeito escolhido + sons engraçados (se ligados). Respeita "grito em voz alta".
export function gritar(texto, tipo = 'truco') {
  if (!vozLigada()) return;
  const p = lerPrefs();
  const c = audio();
  const t = c ? c.currentTime + 0.02 : 0;
  try {
    if (c && p.efeito === 'megafone') chiado(c, t);
    if (c && p.efeito === 'robo') zumbido(c, t);
    if (c && p.sons) {
      if (tipo === 'quero') boing(c, t + 0.05);
      else if (tipo === 'correu') trombone(c, t + 0.05);
      else if (p.efeito !== 'pato') quack(c, t, 520, 0.15, 0.22);
    }
    if (p.efeito === 'pato') { if (c) somPato(tipo === 'truco' ? 3 : 2); return; }
    if (!('speechSynthesis' in window)) return;
    const f = FALA[p.efeito] || FALA.normal;
    const falar = (vol, atraso = 0) => {
      const u = new SpeechSynthesisUtterance(texto.replace(/!/g, ''));
      u.lang = 'pt-BR'; u.rate = f.rate; u.pitch = f.pitch; u.volume = vol;
      const v = escolherVoz(); if (v) u.voice = v;
      if (atraso) setTimeout(() => speechSynthesis.speak(u), atraso); else speechSynthesis.speak(u);
    };
    speechSynthesis.cancel();
    falar(1);
    if (p.efeito === 'eco') falar(0.4, 700);
  } catch {}
}
