// Xadrez com as regras oficiais: roque, en passant, promoção, xeque, xeque-mate, afogamento,
// empate por material insuficiente, regra dos 50 lances e repetição tripla.
// Tabuleiro: 64 casas, índice = linha*8 + coluna; linha 0 é a 8ª fileira (lado das pretas).
export const PECAS = { wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙', bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟' };
export const NOME_PECA = { K: 'rei', Q: 'dama', R: 'torre', B: 'bispo', N: 'cavalo', P: 'peão' };
const VALOR = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const outra = (c) => (c === 'w' ? 'b' : 'w');
const lin = (i) => i >> 3, col = (i) => i & 7;
const dentro = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function inicial() {
  const b = Array(64).fill(null);
  const fundo = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  fundo.forEach((p, c) => { b[c] = 'b' + p; b[56 + c] = 'w' + p; b[8 + c] = 'bP'; b[48 + c] = 'wP'; });
  return { b, vez: 'w', rook: { wK: true, wQ: true, bK: true, bQ: true }, ep: null, meio: 0, num: 1, reps: {} , ultimo: null };
}
const chaveEstado = (s) => s.b.map((x) => x || '-').join('') + s.vez + Object.values(s.rook).map(Number).join('') + (s.ep ?? '');

const DIR_N = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const DIR_R = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIR_B = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// A casa i é atacada por alguma peça da cor c?
export function atacada(b, i, c) {
  const r = lin(i), co = col(i);
  const pr = c === 'w' ? r + 1 : r - 1; // peão da cor c que ataca i está uma linha "atrás"
  for (const dc of [-1, 1]) if (dentro(pr, co + dc) && b[pr * 8 + co + dc] === c + 'P') return true;
  for (const [dr, dc] of DIR_N) if (dentro(r + dr, co + dc) && b[(r + dr) * 8 + co + dc] === c + 'N') return true;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && dentro(r + dr, co + dc) && b[(r + dr) * 8 + co + dc] === c + 'K') return true;
  const raio = (dirs, tipos) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = co + dc;
      while (dentro(rr, cc)) {
        const x = b[rr * 8 + cc];
        if (x) { if (x[0] === c && tipos.includes(x[1])) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  };
  return raio(DIR_R, 'RQ') || raio(DIR_B, 'BQ');
}
const reiEm = (b, c) => b.indexOf(c + 'K');
export const emXeque = (s, c = s.vez) => atacada(s.b, reiEm(s.b, c), outra(c));

function pseudo(s, i) {
  const x = s.b[i]; if (!x) return [];
  const c = x[0], t = x[1], r = lin(i), co = col(i), out = [];
  const add = (para, extra) => out.push({ de: i, para, ...extra });
  if (t === 'P') {
    const d = c === 'w' ? -1 : 1, ini = c === 'w' ? 6 : 1, ult = c === 'w' ? 0 : 7;
    const nr = r + d;
    const promo = (para) => (lin(para) === ult ? ['Q', 'R', 'B', 'N'].forEach((p) => add(para, { promo: p })) : add(para));
    if (dentro(nr, co) && !s.b[nr * 8 + co]) {
      promo(nr * 8 + co);
      if (r === ini && !s.b[(nr + d) * 8 + co]) add((nr + d) * 8 + co, { duplo: true });
    }
    for (const dc of [-1, 1]) {
      if (!dentro(nr, co + dc)) continue;
      const p = nr * 8 + co + dc, alvo = s.b[p];
      if (alvo && alvo[0] !== c) promo(p);
      else if (!alvo && s.ep === p) add(p, { ep: true });
    }
  } else if (t === 'N') {
    for (const [dr, dc] of DIR_N) if (dentro(r + dr, co + dc)) { const p = (r + dr) * 8 + co + dc; if (!s.b[p] || s.b[p][0] !== c) add(p); }
  } else if (t === 'K') {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && dentro(r + dr, co + dc)) { const p = (r + dr) * 8 + co + dc; if (!s.b[p] || s.b[p][0] !== c) add(p); }
    const base = c === 'w' ? 60 : 4;
    if (i === base && !atacada(s.b, i, outra(c))) {
      if (s.rook[c + 'K'] && s.b[base + 3] === c + 'R' && !s.b[base + 1] && !s.b[base + 2] && !atacada(s.b, base + 1, outra(c)) && !atacada(s.b, base + 2, outra(c))) add(base + 2, { roque: 'K' });
      if (s.rook[c + 'Q'] && s.b[base - 4] === c + 'R' && !s.b[base - 1] && !s.b[base - 2] && !s.b[base - 3] && !atacada(s.b, base - 1, outra(c)) && !atacada(s.b, base - 2, outra(c))) add(base - 2, { roque: 'Q' });
    }
  } else {
    const dirs = t === 'R' ? DIR_R : t === 'B' ? DIR_B : [...DIR_R, ...DIR_B];
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = co + dc;
      while (dentro(rr, cc)) {
        const p = rr * 8 + cc;
        if (!s.b[p]) add(p); else { if (s.b[p][0] !== c) add(p); break; }
        rr += dr; cc += dc;
      }
    }
  }
  return out;
}

export function aplicarMov(s, m) {
  const b = [...s.b], x = b[m.de], c = x[0];
  const alvo = b[m.para];
  b[m.para] = m.promo ? c + m.promo : x; b[m.de] = null;
  if (m.ep) b[m.para + (c === 'w' ? 8 : -8)] = null;
  if (m.roque === 'K') { b[m.para - 1] = b[m.para + 1]; b[m.para + 1] = null; }
  if (m.roque === 'Q') { b[m.para + 1] = b[m.para - 2]; b[m.para - 2] = null; }
  const rook = { ...s.rook };
  if (x[1] === 'K') { rook[c + 'K'] = false; rook[c + 'Q'] = false; }
  const toca = (i) => { if (i === 63) rook.wK = false; if (i === 56) rook.wQ = false; if (i === 7) rook.bK = false; if (i === 0) rook.bQ = false; };
  toca(m.de); toca(m.para);
  const n = { b, vez: outra(c), rook, ep: m.duplo ? (m.de + m.para) / 2 : null, meio: x[1] === 'P' || alvo || m.ep ? 0 : s.meio + 1, num: s.num + (c === 'b' ? 1 : 0), reps: { ...s.reps }, ultimo: { de: m.de, para: m.para } };
  const k = chaveEstado(n); n.reps[k] = (n.reps[k] || 0) + 1;
  return n;
}

export function legais(s, i) {
  const c = s.b[i]?.[0];
  if (!c || c !== s.vez) return [];
  return pseudo(s, i).filter((m) => !atacada(aplicarMov(s, m).b, reiEm(aplicarMov(s, m).b, c), outra(c)));
}
export function todosLegais(s) {
  const out = [];
  for (let i = 0; i < 64; i++) if (s.b[i]?.[0] === s.vez) out.push(...legais(s, i));
  return out;
}
const semMaterial = (b) => {
  const resto = b.filter((x) => x && x[1] !== 'K');
  if (!resto.length) return true;
  if (resto.length === 1 && 'BN'.includes(resto[0][1])) return true;
  return false;
};
// Estado da partida: jogando | xeque | mate | afogado | material | cinquenta | repeticao
export function situacao(s) {
  const tem = todosLegais(s).length > 0;
  const xq = emXeque(s);
  if (!tem) return xq ? 'mate' : 'afogado';
  if (semMaterial(s.b)) return 'material';
  if (s.meio >= 100) return 'cinquenta';
  if ((s.reps[chaveEstado(s)] || 0) >= 3) return 'repeticao';
  return xq ? 'xeque' : 'jogando';
}
export const TEXTO_FIM = { mate: 'Xeque-mate!', afogado: 'Empate por afogamento (sem lances e sem xeque).', material: 'Empate: não há peças suficientes para dar mate.', cinquenta: 'Empate pela regra dos 50 lances.', repeticao: 'Empate por repetição tripla da posição.' };

// Notação simples do lance (ex.: e2-e4).
export const nomeCasa = (i) => 'abcdefgh'[col(i)] + (8 - lin(i));

// ---- Computador: minimax com poda alfa-beta ----
function avaliar(s) {
  let v = 0;
  for (let i = 0; i < 64; i++) {
    const x = s.b[i]; if (!x) continue;
    const sinal = x[0] === 'w' ? 1 : -1;
    let ex = 0;
    if (x[1] === 'P') { const avanco = x[0] === 'w' ? 6 - lin(i) : lin(i) - 1; ex = avanco * 6 + (col(i) > 1 && col(i) < 6 ? 4 : 0); }
    else if (x[1] !== 'K' && x[1] !== 'R') ex = 10 - (Math.abs(3.5 - col(i)) + Math.abs(3.5 - lin(i))) * 3;
    v += sinal * (VALOR[x[1]] + ex);
  }
  return v;
}
function busca(s, prof, alfa, beta) {
  const ms = todosLegais(s);
  if (!ms.length) return emXeque(s) ? (s.vez === 'w' ? -99999 - prof : 99999 + prof) : 0;
  if (prof === 0) return avaliar(s);
  ms.sort((a, b) => (s.b[b.para] ? VALOR[s.b[b.para][1]] : 0) - (s.b[a.para] ? VALOR[s.b[a.para][1]] : 0));
  if (s.vez === 'w') {
    let melhor = -Infinity;
    for (const m of ms) { melhor = Math.max(melhor, busca(aplicarMov(s, m), prof - 1, alfa, beta)); alfa = Math.max(alfa, melhor); if (beta <= alfa) break; }
    return melhor;
  }
  let melhor = Infinity;
  for (const m of ms) { melhor = Math.min(melhor, busca(aplicarMov(s, m), prof - 1, alfa, beta)); beta = Math.min(beta, melhor); if (beta <= alfa) break; }
  return melhor;
}
// nivel: 1 fácil (lance quase aleatório), 2 médio (olha 2 jogadas), 3 difícil (olha 3)
export function lanceComputador(s, nivel = 2) {
  const ms = todosLegais(s);
  if (!ms.length) return null;
  if (nivel === 1 && Math.random() < 0.6) return ms[Math.floor(Math.random() * ms.length)];
  const prof = nivel >= 3 ? 3 : 2;
  let melhor = null, mv = s.vez === 'w' ? -Infinity : Infinity;
  const emb = [...ms].sort(() => Math.random() - 0.5);
  for (const m of emb) {
    const v = busca(aplicarMov(s, m), prof - 1, -Infinity, Infinity);
    if (s.vez === 'w' ? v > mv : v < mv) { mv = v; melhor = m; }
  }
  return melhor;
}
