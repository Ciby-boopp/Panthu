// Total de confirmados de vários eventos: 1 chamada ao banco (se o SQL da Etapa 4 foi rodado)
// ou, na falta dele, uma chamada por evento como antes.
export async function totaisConfirmados(sb, ids) {
  if (!ids.length) return [];
  const { data, error } = await sb.rpc('totais_confirmados', { ids });
  if (!error && Array.isArray(data)) {
    const m = new Map(data.map((x) => [x.evento_id, Number(x.total) || 0]));
    return ids.map((id) => m.get(id) || 0);
  }
  return Promise.all(ids.map(async (id) => (await sb.rpc('total_confirmados', { ev: id })).data || 0));
}
