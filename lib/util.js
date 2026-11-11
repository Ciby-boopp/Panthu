export const paraISO = (v) => (v ? new Date(`${v}:00-03:00`).toISOString() : null);
export const deISO = (iso) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 16) : '');
export const quando = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

const TIPOS = ['image/png', 'image/jpeg', 'image/webp'];

// Reduz fotos grandes do celular antes de enviar
async function reduzir(arquivo, max, forcar) {
  if (!forcar && arquivo.size <= 1.5 * 1024 * 1024) return arquivo;
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const tipo = arquivo.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((ok) => c.toBlob(ok, tipo, 0.85));
    return blob ? new File([blob], 'img', { type: tipo }) : arquivo;
  } catch { return arquivo; } finally { URL.revokeObjectURL(url); }
}

export async function enviarImagem(sb, bucket, arquivo, { pasta, max = 1600, forcar = false } = {}) {
  if (!arquivo || !arquivo.size) return null;
  if (!TIPOS.includes(arquivo.type)) throw new Error('Use imagem PNG, JPG ou WEBP.');
  const f = await reduzir(arquivo, max, forcar);
  if (f.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter até 2 MB.');
  const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
  const caminho = `${pasta ? pasta + '/' : ''}${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(caminho, f, { contentType: f.type });
  if (error) throw new Error('Não foi possível enviar a imagem.');
  return sb.storage.from(bucket).getPublicUrl(caminho).data.publicUrl;
}

export async function auditar(sb, acao, detalhes) {
  const { data: { user } } = await sb.auth.getUser();
  await sb.from('auditoria').insert({ autor_id: user.id, acao, detalhes });
}
