import { rng } from './cartas';

export const PALAVRAS = ['AMIGOS', 'ENCONTRO', 'CAFE', 'JOGOS', 'CONVERSA', 'RESPEITO', 'COMUNIDADE', 'MESA', 'TRUCO', 'XADREZ', 'MEMORIA', 'CARTAS', 'BRINDE', 'RISADA', 'AMIZADE', 'SORRISO', 'PARCERIA', 'CIDADE', 'MUSICA', 'PASSEIO', 'VIAGEM', 'CINEMA', 'LEITURA', 'DANCA', 'CULINARIA', 'HOBBY', 'PONTOS', 'CONVITE'];
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
export const TAM = 12;

// Gera o mesmo caça-palavras para a mesma semente (os dois celulares recebem o mesmo desafio).
export function gerar(semente, qtd = 8) {
  const r = rng(semente);
  const g = Array.from({ length: TAM }, () => Array(TAM).fill(''));
  const escolhidas = [...PALAVRAS].sort(() => r() - 0.5).slice(0, qtd).sort((a, b) => b.length - a.length);
  const colocadas = [];
  for (const p of escolhidas) {
    for (let tent = 0; tent < 200; tent++) {
      const [dr, dc] = DIRS[Math.floor(r() * DIRS.length)];
      const l = Math.floor(r() * TAM), c = Math.floor(r() * TAM);
      const fl = l + dr * (p.length - 1), fc = c + dc * (p.length - 1);
      if (fl < 0 || fl >= TAM || fc < 0 || fc >= TAM) continue;
      let ok = true;
      for (let k = 0; k < p.length; k++) { const x = g[l + dr * k][c + dc * k]; if (x && x !== p[k]) { ok = false; break; } }
      if (!ok) continue;
      for (let k = 0; k < p.length; k++) g[l + dr * k][c + dc * k] = p[k];
      colocadas.push(p);
      break;
    }
  }
  const letras = 'ABCDEFGHIJLMNOPQRSTUVXZ';
  for (let i = 0; i < TAM; i++) for (let j = 0; j < TAM; j++) if (!g[i][j]) g[i][j] = letras[Math.floor(r() * letras.length)];
  return { grade: g, palavras: colocadas };
}

// Letras entre duas casas (só vale em linha reta: horizontal, vertical ou diagonal).
export function linha(a, b) {
  const [l1, c1] = a, [l2, c2] = b;
  const dl = l2 - l1, dc = c2 - c1;
  if (dl !== 0 && dc !== 0 && Math.abs(dl) !== Math.abs(dc)) return null;
  const n = Math.max(Math.abs(dl), Math.abs(dc));
  const sl = Math.sign(dl), sc = Math.sign(dc);
  return Array.from({ length: n + 1 }, (_, k) => [l1 + sl * k, c1 + sc * k]);
}
