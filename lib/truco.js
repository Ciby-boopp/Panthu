// Motor do Truco Paulista (1 contra 1). Funções puras: o estado é um objeto simples (serializável),
// então serve tanto para jogar contra o computador quanto online (o anfitrião guarda o estado).
import { baralho, embaralhar } from './cartas';

export const ORDEM = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const FORCA_NAIPE = { '♦': 1, '♠': 2, '♥': 3, '♣': 4 }; // pica-fumo < espadilha < copeta < zap
export const PROX = { 1: 3, 3: 6, 6: 9, 9: 12 };
export const NOME_AUMENTO = { 3: 'Truco!', 6: 'Seis!', 9: 'Nove!', 12: 'Doze!' };

export const manilhaDe = (vira) => ORDEM[(ORDEM.indexOf(vira.v) + 1) % ORDEM.length];
export const forca = (c, vira) => (c.v === manilhaDe(vira) ? 100 + FORCA_NAIPE[c.n] : ORDEM.indexOf(c.v));

const clone = (x) => JSON.parse(JSON.stringify(x));

function novaMao(placar, mao, n) {
  const b = embaralhar(baralho(['A', '2', '3', '4', '5', '6', '7', 'Q', 'J', 'K']));
  let valor = 1, semTruco = false, msg = '';
  if (placar[0] === 11 && placar[1] === 11) { semTruco = true; msg = 'Mão de ferro: quem ganhar leva a partida.'; }
  else if (placar[0] === 11 || placar[1] === 11) { valor = 3; semTruco = true; msg = 'Mão de onze: vale 3 pontos e não tem truco.'; }
  return {
    placar: [...placar], mao, n, vira: b[6], maos: [b.slice(0, 3), b.slice(3, 6)],
    mesa: [[null, null]], res: [], lid: [mao], vez: mao, valor, semTruco, pedido: null, ultimo: null,
    fase: 'jogando', vencedorMao: null, ptsMao: 0, motivo: '', msg,
  };
}
export const novoJogo = () => novaMao([0, 0], 0, 1);

function vencedorMao(n) {
  const r = n.res, c = [0, 0];
  r.forEach((x) => { if (x !== 'e') c[x]++; });
  if (r.length >= 2) {
    if (c[0] === 2) return 0;
    if (c[1] === 2) return 1;
  }
  if (r.length === 2) {
    if (r[0] === 'e' && r[1] !== 'e') return r[1];
    if (r[0] !== 'e' && r[1] === 'e') return r[0];
    return null; // 1 a 1, ou dois empates
  }
  if (r.length === 3) {
    if (r[2] !== 'e') return r[2];
    if (r[0] !== 'e') return r[0];
    return n.mao; // tudo empatado: ganha quem era "mão"
  }
  return null;
}

function terminarMao(n, venc, pts, motivo) {
  n.placar[venc] = Math.min(12, n.placar[venc] + pts);
  n.pedido = null;
  n.vencedorMao = venc;
  n.ptsMao = pts;
  n.motivo = motivo;
  n.fase = n.placar[venc] >= 12 ? 'fimJogo' : 'fimMao';
  return n;
}

function fecharVaza(n) {
  const [a, b] = n.mesa[n.mesa.length - 1];
  const fa = forca(a, n.vira), fb = forca(b, n.vira);
  const r = fa > fb ? 0 : fb > fa ? 1 : 'e';
  n.res.push(r);
  const v = vencedorMao(n);
  if (v !== null) return terminarMao(n, v, n.valor, 'normal');
  n.mesa.push([null, null]);
  n.vez = r === 'e' ? n.lid[n.lid.length - 1] : r;
  n.lid.push(n.vez);
  return n;
}

// Ações: {t:'jogar',seat,i} {t:'truco',seat} {t:'aceitar',seat} {t:'correr',seat} {t:'aumentar',seat} {t:'proxima'}
export function aplicar(s, a) {
  if (a.t === 'proxima') return s.fase === 'fimMao' ? novaMao(s.placar, 1 - s.mao, s.n + 1) : s;
  if (s.fase === 'fimJogo' || s.fase === 'fimMao') return s;
  const n = clone(s);
  if (a.t === 'jogar') {
    if (n.pedido || n.vez !== a.seat) return s;
    const carta = n.maos[a.seat][a.i];
    if (!carta) return s;
    n.maos[a.seat].splice(a.i, 1);
    n.mesa[n.mesa.length - 1][a.seat] = carta;
    n.msg = '';
    if (n.mesa[n.mesa.length - 1][0] && n.mesa[n.mesa.length - 1][1]) return fecharVaza(n);
    n.vez = 1 - a.seat;
    return n;
  }
  if (a.t === 'truco') {
    if (n.pedido || n.vez !== a.seat || n.semTruco || n.valor >= 12 || n.ultimo === a.seat) return s;
    n.pedido = { de: a.seat, para: PROX[n.valor] };
    n.msg = '';
    return n;
  }
  if (!n.pedido || a.seat !== 1 - n.pedido.de) return s;
  const p = n.pedido;
  if (a.t === 'aceitar') { n.valor = p.para; n.ultimo = p.de; n.pedido = null; return n; }
  if (a.t === 'correr') return terminarMao(n, p.de, n.valor, 'correu');
  if (a.t === 'aumentar') {
    if (p.para >= 12) return s;
    n.valor = p.para; n.ultimo = a.seat;
    n.pedido = { de: a.seat, para: PROX[p.para] };
    return n;
  }
  return s;
}

// O que o jogador "seat" enxerga: as cartas do adversário viram null.
export function visao(s, seat) {
  const v = clone(s);
  v.maos[1 - seat] = v.maos[1 - seat].map(() => null);
  return v;
}

/* ---------- computador ---------- */
const pts = (c, vira) => { const f = forca(c, vira); return f >= 100 ? 10 + (f - 100) : f; }; // 0..14

function forcaMao(s, seat) {
  const cs = s.maos[seat].map((c) => pts(c, s.vira)).sort((a, b) => b - a);
  if (!cs.length) return 0;
  const top = cs.slice(0, 2);
  let f = top.reduce((x, y) => x + y, 0) / (top.length * 14);
  f += s.res.filter((x) => x === seat).length * 0.18 - s.res.filter((x) => x === 1 - seat).length * 0.18;
  return Math.max(0, Math.min(1, f));
}

function escolherCarta(s, seat) {
  const mao = s.maos[seat];
  const asc = mao.map((_, i) => i).sort((x, y) => forca(mao[x], s.vira) - forca(mao[y], s.vira));
  const op = s.mesa[s.mesa.length - 1][1 - seat];
  if (op) {
    const fo = forca(op, s.vira);
    const vence = asc.find((i) => forca(mao[i], s.vira) > fo);
    return vence !== undefined ? vence : asc[0];
  }
  if (s.res.length === 0) return asc[Math.floor(asc.length / 2)];
  return asc[asc.length - 1];
}

export function decidirIA(s, seat = 1) {
  if (s.fase !== 'jogando') return null;
  if (s.pedido) {
    if (s.pedido.de === seat) return null;
    const alvo = s.pedido.para;
    const limiar = { 3: 0.42, 6: 0.55, 9: 0.68, 12: 0.78 }[alvo];
    const f = forcaMao(s, seat) + (Math.random() - 0.5) * 0.16;
    if (alvo < 12 && f > limiar + 0.2) return { t: 'aumentar', seat };
    return { t: f > limiar ? 'aceitar' : 'correr', seat };
  }
  if (s.vez !== seat) return null;
  if (!s.semTruco && s.valor < 12 && s.ultimo !== seat) {
    const f = forcaMao(s, seat);
    const chance = f > 0.7 ? 0.5 : f > 0.55 ? 0.2 : f < 0.25 ? 0.07 : 0.02;
    if (Math.random() < chance) return { t: 'truco', seat };
  }
  return { t: 'jogar', seat, i: escolherCarta(s, seat) };
}
