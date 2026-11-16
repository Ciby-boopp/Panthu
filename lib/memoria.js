import { baralho, embaralhar, idCarta } from './cartas';

// Memória para duas pessoas online. O anfitrião guarda o estado completo; quem joga recebe só as cartas viradas (visao).
export function novaMemoria(pares = 8) {
  const faces = embaralhar(baralho()).slice(0, pares);
  const cartas = embaralhar([...faces, ...faces]).map((f, id) => ({ id, f, achada: false }));
  return { cartas, viradas: [], vez: 0, pares: [0, 0], total: pares, jogadas: 0, fase: 'jogando' };
}
export function virar(s, i, seat) {
  if (s.fase !== 'jogando' || s.vez !== seat || s.viradas.length >= 2) return s;
  const c = s.cartas[i];
  if (!c || c.achada || s.viradas.includes(i)) return s;
  return { ...s, viradas: [...s.viradas, i] };
}
export const combina = (s) => s.viradas.length === 2 && idCarta(s.cartas[s.viradas[0]].f) === idCarta(s.cartas[s.viradas[1]].f);
// Chamar quando há 2 cartas viradas: marca o par (e a pessoa joga de novo) ou passa a vez.
export function resolver(s) {
  if (s.viradas.length !== 2) return s;
  const [a, b] = s.viradas;
  const ok = combina(s);
  const cartas = s.cartas.map((c, k) => (ok && (k === a || k === b) ? { ...c, achada: true } : c));
  const pares = s.pares.map((p, k) => (ok && k === s.vez ? p + 1 : p));
  const fim = cartas.every((c) => c.achada);
  return { ...s, cartas, pares, viradas: [], vez: ok ? s.vez : 1 - s.vez, jogadas: s.jogadas + 1, fase: fim ? 'fim' : 'jogando' };
}
export const visao = (s) => ({ ...s, cartas: s.cartas.map((c) => ({ id: c.id, achada: c.achada, f: c.achada || s.viradas.includes(c.id) ? c.f : null })) });
