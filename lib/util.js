export const paraISO = (v) => (v ? new Date(`${v}:00-03:00`).toISOString() : null);
export const deISO = (iso) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 16) : '');
export const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export async function enviarImagem(sb, bucket, arquivo) {
  if (!arquivo || !arquivo.size) return null;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) throw new Error('Use imagem PNG, JPG ou WEBP.');
  if (arquivo.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter até 2 MB.');
  const ext = arquivo.type === 'image/png' ? 'png' : arquivo.type === 'image/webp' ? 'webp' : 'jpg';
  const caminho = `${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) throw new Error('Não foi possível enviar a imagem. Confira se rodou o arquivo panthu-03-storage.sql.');
  return sb.storage.from(bucket).getPublicUrl(caminho).data.publicUrl;
}

export async function auditar(sb, acao, detalhes) {
  const { data: { user } } = await sb.auth.getUser();
  await sb.from('auditoria').insert({ autor_id: user.id, acao, detalhes });
}
