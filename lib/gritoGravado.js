// Grito gravado pela própria pessoa (Configurações → "Meu grito de TRUCO").
// Fica salvo só neste aparelho (localStorage) e tem no máximo ~3 segundos. Sem gravação, o jogo usa a voz com efeitos.
const CHAVE = 'panthu_grito_gravado';
export const MAX_MS = 3000;

export function lerGrito() { try { return localStorage.getItem(CHAVE) || null; } catch { return null; } }
export function temGrito() { return !!lerGrito(); }
export function salvarGrito(dataUrl) { try { localStorage.setItem(CHAVE, dataUrl); return true; } catch { return false; } }
export function apagarGrito() { try { localStorage.removeItem(CHAVE); } catch {} }
export function gravacaoSuportada() { return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'; }

// Grava até MAX_MS (ou até pararAntes() ser chamado). Devolve um data URL de áudio.
export async function gravar(aoIniciar) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const tipo = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo, audioBitsPerSecond: 24000 } : undefined);
  const partes = [];
  rec.ondataavailable = (e) => { if (e.data?.size) partes.push(e.data); };
  const fim = new Promise((ok, erro) => { rec.onstop = ok; rec.onerror = erro; });
  rec.start();
  aoIniciar?.(() => { if (rec.state !== 'inactive') rec.stop(); });
  const t = setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, MAX_MS);
  await fim;
  clearTimeout(t);
  stream.getTracks().forEach((x) => x.stop()); // solta o microfone
  const blob = new Blob(partes, { type: rec.mimeType || tipo || 'audio/webm' });
  if (blob.size < 800) throw new Error('curto');
  return await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = erro; r.readAsDataURL(blob); });
}

let atual = null;
export function tocarGrito(dataUrl) {
  try {
    if (atual) { atual.pause(); atual = null; }
    const a = new Audio(dataUrl); a.volume = 1; atual = a;
    return a.play().then(() => true, () => false);
  } catch { return Promise.resolve(false); }
}
