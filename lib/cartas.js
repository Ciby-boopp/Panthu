export const NAIPES = ['♠', '♥', '♦', '♣'];
export const NOME_NAIPE = { '♠': 'espadas', '♥': 'copas', '♦': 'ouros', '♣': 'paus' };
export const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const vermelho = (n) => n === '♥' || n === '♦';
export const idCarta = (c) => c.v + c.n;
export const rank = (c) => VALORES.indexOf(c.v) + 1; // A=1 ... K=13

export function baralho(valores = VALORES) {
  const b = [];
  for (const n of NAIPES) for (const v of valores) b.push({ v, n });
  return b;
}

// Gerador pseudo-aleatório com semente (permite dois jogadores receberem o mesmo baralho).
export function rng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function embaralhar(lista, r = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
