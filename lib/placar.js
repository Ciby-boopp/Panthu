import { criarCliente } from '@/lib/supabase/client';

// Salva uma partida no Supabase (tabela jogos_partidas). Nunca lança erro: devolve { erro }.
export async function salvarPartida({ jogo, modo, pontos, vitoria = null, detalhes = {} }) {
  try {
    const sb = criarCliente();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { erro: 'Sem sessão' };
    const p = Math.max(0, Math.min(100000, Math.round(pontos || 0)));
    const { error } = await sb.from('jogos_partidas').insert({ usuario_id: user.id, jogo, modo, pontos: p, vitoria, detalhes });
    return { erro: error ? error.message : null };
  } catch (e) {
    return { erro: String(e?.message || e) };
  }
}
