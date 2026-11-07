'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import { enviarImagem, auditar } from '@/lib/util';

export default function EstabForm({ inicial }) {
  const [msg, setMsg] = useState(null);
  const [c, setC] = useState(false);
  const router = useRouter();

  async function salvar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target); const sb = criarCliente();
    try {
      const logo = await enviarImagem(sb, 'logos', f.get('logo'));
      const num = (k) => { const v = String(f.get(k)).trim().replace(',', '.'); return v === '' ? null : Number(v); };
      const lat = num('latitude'), lng = num('longitude');
      if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error('Latitude e longitude devem ser números.');
      const dados = {
        nome: String(f.get('nome')).trim(), descricao: String(f.get('descricao')).trim() || null,
        endereco: String(f.get('endereco')).trim(), contato: String(f.get('contato')).trim() || null,
        latitude: lat, longitude: lng, redes: { instagram: String(f.get('instagram')).trim() },
        ativo: f.get('ativo') === 'on'
      };
      if (logo) dados.logo_url = logo;
      let id = inicial?.id;
      if (id) { const { error } = await sb.from('estabelecimentos').update(dados).eq('id', id); if (error) throw error; }
      else { const { data, error } = await sb.from('estabelecimentos').insert(dados).select('id').single(); if (error) throw error; id = data.id; }
      await auditar(sb, inicial ? 'editou_estabelecimento' : 'criou_estabelecimento', { id });
      if (inicial) { setMsg({ t: 'ok', m: 'Salvo!' }); setC(false); router.refresh(); }
      else { router.push(`/admin/estabelecimentos/${id}`); router.refresh(); }
    } catch (err) { setMsg({ t: 'erro', m: err.message || 'Não foi possível salvar.' }); setC(false); }
  }

  async function excluir() {
    if (!confirm('Excluir este estabelecimento e o cardápio dele?')) return;
    const sb = criarCliente();
    const { error } = await sb.from('estabelecimentos').delete().eq('id', inicial.id);
    if (error) { setMsg({ t: 'erro', m: 'Não foi possível excluir. Há eventos vinculados a ele?' }); return; }
    await auditar(sb, 'excluiu_estabelecimento', { id: inicial.id });
    router.push('/admin/estabelecimentos'); router.refresh();
  }

  const i = inicial || {};
  return (
    <form onSubmit={salvar} className="card">
      <div className="campo"><label htmlFor="nome">Nome do estabelecimento</label><input id="nome" name="nome" required defaultValue={i.nome} /></div>
      <div className="campo"><label htmlFor="logo">Logo (PNG, JPG ou WEBP, até 2 MB)</label>
        {i.logo_url && <img className="preview" src={i.logo_url} alt="Logo atual" />}
        <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></div>
      <div className="campo"><label htmlFor="descricao">Descrição</label><textarea id="descricao" name="descricao" defaultValue={i.descricao || ''} /></div>
      <div className="campo"><label htmlFor="endereco">Endereço</label><input id="endereco" name="endereco" required defaultValue={i.endereco} /></div>
      <div className="dois">
        <div className="campo"><label htmlFor="latitude">Latitude (opcional)</label><input id="latitude" name="latitude" inputMode="decimal" defaultValue={i.latitude ?? ''} /></div>
        <div className="campo"><label htmlFor="longitude">Longitude (opcional)</label><input id="longitude" name="longitude" inputMode="decimal" defaultValue={i.longitude ?? ''} /></div>
      </div>
      <div className="campo"><label htmlFor="contato">Contato</label><input id="contato" name="contato" defaultValue={i.contato || ''} /></div>
      <div className="campo"><label htmlFor="instagram">Instagram (link ou @)</label><input id="instagram" name="instagram" defaultValue={i.redes?.instagram || ''} /></div>
      <label><input type="checkbox" name="ativo" defaultChecked={i.ativo ?? true} />Ativo</label>
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
      <div className="linha" style={{ marginTop: 12 }}>
        <button className="btn p" disabled={c}>{c ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Criar estabelecimento'}</button>
        {inicial && <button type="button" className="btn perigo" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  );
}
