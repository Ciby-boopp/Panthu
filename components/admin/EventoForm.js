'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import { enviarImagem, auditar, paraISO, deISO } from '@/lib/util';

export default function EventoForm({ inicial, locais }) {
  const [msg, setMsg] = useState(null);
  const [c, setC] = useState(false);
  const router = useRouter();

  async function salvar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target); const sb = criarCliente();
    try {
      const banner = await enviarImagem(sb, 'banners', f.get('banner'));
      const inicio = paraISO(f.get('inicio'));
      if (!inicio) throw new Error('Informe data e hora.');
      const cap = String(f.get('capacidade')).trim();
      if (cap !== '' && !(parseInt(cap, 10) > 0)) throw new Error('O limite de participantes deve ser maior que zero.');
      const dados = {
        nome: String(f.get('nome')).trim(), descricao: String(f.get('descricao')).trim() || null,
        orientacoes: String(f.get('orientacoes')).trim() || null, inicio,
        capacidade: cap === '' ? null : parseInt(cap, 10),
        estabelecimento_id: f.get('estabelecimento') || null, publicado: f.get('publicado') === 'on'
      };
      if (banner) dados.banner_url = banner;
      let id = inicial?.id;
      if (id) { const { error } = await sb.from('eventos').update(dados).eq('id', id); if (error) throw error; }
      else { const { data, error } = await sb.from('eventos').insert(dados).select('id').single(); if (error) throw error; id = data.id; }
      await auditar(sb, inicial ? 'editou_evento' : 'criou_evento', { id, publicado: dados.publicado });
      if (inicial) { setMsg({ t: 'ok', m: 'Salvo!' }); setC(false); router.refresh(); }
      else { router.push(`/admin/eventos/${id}`); router.refresh(); }
    } catch (err) { setMsg({ t: 'erro', m: err.message || 'Não foi possível salvar.' }); setC(false); }
  }

  async function excluir() {
    if (!confirm('Excluir este evento e todas as confirmações dele?')) return;
    const sb = criarCliente();
    const { error } = await sb.from('eventos').delete().eq('id', inicial.id);
    if (error) { setMsg({ t: 'erro', m: 'Não foi possível excluir.' }); return; }
    await auditar(sb, 'excluiu_evento', { id: inicial.id });
    router.push('/admin/eventos'); router.refresh();
  }

  const i = inicial || {};
  return (
    <form onSubmit={salvar} className="card">
      <div className="campo"><label htmlFor="nome">Nome do evento</label><input id="nome" name="nome" required defaultValue={i.nome} /></div>
      <div className="campo"><label htmlFor="banner">Banner (PNG, JPG ou WEBP, até 2 MB)</label>
        {i.banner_url && <img className="preview" src={i.banner_url} alt="Banner atual" />}
        <input id="banner" name="banner" type="file" accept="image/png,image/jpeg,image/webp" /></div>
      <div className="campo"><label htmlFor="descricao">Descrição</label><textarea id="descricao" name="descricao" defaultValue={i.descricao || ''} /></div>
      <div className="dois">
        <div className="campo"><label htmlFor="inicio">Data e horário</label><input id="inicio" name="inicio" type="datetime-local" required defaultValue={deISO(i.inicio)} /></div>
        <div className="campo"><label htmlFor="capacidade">Limite de pessoas</label><input id="capacidade" name="capacidade" type="number" min="1" placeholder="Sem limite" defaultValue={i.capacidade ?? ''} /></div>
      </div>
      <div className="campo"><label htmlFor="estabelecimento">Estabelecimento</label>
        <select id="estabelecimento" name="estabelecimento" defaultValue={i.estabelecimento_id || ''}>
          <option value="">Local a definir</option>
          {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select></div>
      <div className="campo"><label htmlFor="orientacoes">Informações e orientações do encontro</label><textarea id="orientacoes" name="orientacoes" defaultValue={i.orientacoes || ''} /></div>
      <label><input type="checkbox" name="publicado" defaultChecked={i.publicado ?? false} />Publicado (visível para os participantes)</label>
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
      <div className="linha" style={{ marginTop: 12 }}>
        <button className="btn p" disabled={c}>{c ? 'Salvando…' : inicial ? 'Salvar alterações' : 'Criar evento'}</button>
        {inicial && <button type="button" className="btn perigo" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  );
}
