'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import { enviarImagem } from '@/lib/util';
import Avatar from './Avatar';

export default function PerfilForm({ perfil }) {
  const [msg, setMsg] = useState(null);
  const [c, setC] = useState(false);
  const [previa, setPrevia] = useState(perfil.foto_url || null);
  const [bio, setBio] = useState(perfil.bio || '');
  const router = useRouter();

  function escolher(e) {
    const f = e.target.files?.[0];
    if (f) setPrevia(URL.createObjectURL(f));
  }

  async function salvar(e) {
    e.preventDefault(); setC(true); setMsg(null);
    const f = new FormData(e.target); const sb = criarCliente();
    try {
      const foto = await enviarImagem(sb, 'avatares', f.get('foto'), { pasta: perfil.id, max: 600, forcar: true });
      const dados = { nome: String(f.get('nome')).trim(), telefone: String(f.get('telefone')).trim(), bio: bio.trim() || null };
      if (foto) dados.foto_url = foto; else if (f.get('remover') === 'on') dados.foto_url = null;
      const { error } = await sb.from('perfis').update(dados).eq('id', perfil.id);
      if (error) throw error;
      if (dados.foto_url === null) setPrevia(null);
      setMsg({ t: 'ok', m: 'Perfil atualizado!' }); router.refresh();
    } catch (err) {
      const amigavel = /^(Use imagem|A imagem deve|Não foi possível enviar)/.test(err?.message || '');
      setMsg({ t: 'erro', m: amigavel ? err.message : 'Não foi possível salvar. Tente de novo.' });
    }
    setC(false);
  }

  return (
    <form onSubmit={salvar} className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar url={previa} nome={perfil.nome} tam={84} />
        <div className="campo" style={{ flex: 1 }}>
          <label htmlFor="foto">Foto de perfil</label>
          <input id="foto" name="foto" type="file" accept="image/png,image/jpeg,image/webp" onChange={escolher} />
        </div>
      </div>
      {perfil.foto_url && <label style={{ fontSize: 14 }}><input type="checkbox" name="remover" style={{ width: 'auto', minHeight: 0, marginRight: 8 }} />Remover minha foto</label>}
      <div className="campo"><label htmlFor="nome">Nome completo</label><input id="nome" name="nome" required minLength={3} defaultValue={perfil.nome} /></div>
      <div className="campo"><label htmlFor="bio">Biografia</label>
        <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} placeholder="Conte um pouco sobre você, seus gostos e o que busca nos encontros" />
        <small style={{ color: 'var(--suave)' }}>{bio.length}/300</small></div>
      <div className="campo"><label htmlFor="tel">Telefone (não aparece para os outros)</label><input id="tel" name="telefone" type="tel" required defaultValue={perfil.telefone || ''} /></div>
      <div className="campo"><label>E-mail</label><input value={perfil.email || ''} readOnly disabled /></div>
      {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
      <button className="btn p" disabled={c}>{c ? 'Salvando…' : 'Salvar'}</button>
    </form>
  );
}
