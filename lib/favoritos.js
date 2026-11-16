// Ids favoritados de um tipo (vazio se o SQL ainda não foi rodado).
export async function favoritosDe(sb, usuarioId, tipo) {
  const { data, error } = await sb.from('favoritos').select('item_id').eq('usuario_id', usuarioId).eq('tipo', tipo);
  return new Set(error ? [] : (data || []).map((x) => x.item_id));
}
