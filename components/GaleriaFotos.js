'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import { enviarImagem } from '@/lib/util';

const MAX = 8;

// Galeria do próprio perfil: adicionar (até 8), apagar e usar uma como foto de perfil.
export default function GaleriaFotos({ usuarioId, fotoAtual }) {
  const router = useRouter();
  const sb = useRef(null);
  const cli = () => (sb.current ||= criarCliente());
  const [fotos, setFotos] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [ver, setVer] = useState(null);

  const carregar = async () => {
    const { data, error } = await cli().from('perfil_fotos').select('id, url').eq('usuario_id', usuarioId).order('ordem').order('criado_em');
    if (error) { setFotos([]); setMsg({ t: 'erro', m: 'A galeria ainda não está ativada. Peça ao administrador para rodar o arquivo perfil-fotos.sql.' }); return; }
    setFotos(data || []);
  };
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function adicionar(ev) {
    const arquivos = [...(ev.target.files || [])];
    ev.target.value = '';
    if (!arquivos.length) return;
    setOcupado(true); setMsg(null);
    let ok = 0;
    try {
      for (const f of arquivos.slice(0, MAX - (fotos?.length || 0))) {
        const url = await enviarImagem(cli(), 'avatares', f, { pasta: usuarioId, max: 1200, forcar: true });
        const { error } = await cli().from('perfil_fotos').insert({ usuario_id: usuarioId, url, ordem: Date.now() % 1000000 });
        if (error) throw error;
        ok++;
      }
      if (arquivos.length > MAX - (fotos?.length || 0)) setMsg({ t: 'erro', m: `O limite é de ${MAX} fotos. Só adicionei as que couberam.` });
      else setMsg({ t: 'ok', m: ok > 1 ? `${ok} fotos adicionadas!` : 'Foto adicionada!' });
    } catch (e) {
      const amigavel = /^(Use imagem|A imagem deve|Não foi possível enviar|Você já tem)/.test(e?.message || '');
      setMsg({ t: 'erro', m: amigavel ? e.message : 'Não foi possível adicionar a foto. Tente de novo.' });
    }
    setOcupado(false); carregar();
  }

  async function apagar(f) {
    if (!confirm('Apagar esta foto da galeria?')) return;
    const { error } = await cli().from('perfil_fotos').delete().eq('id', f.id);
    if (error) return setMsg({ t: 'erro', m: 'Não foi possível apagar.' });
    try { const caminho = decodeURIComponent(f.url.split('/object/public/avatares/')[1] || ''); if (caminho.startsWith(usuarioId + '/')) await cli().storage.from('avatares').remove([caminho]); } catch {}
    setVer(null); carregar();
  }

  async function usarDePerfil(f) {
    const { error } = await cli().from('perfis').update({ foto_url: f.url }).eq('id', usuarioId);
    if (error) return setMsg({ t: 'erro', m: 'Não foi possível trocar a foto de perfil.' });
    setMsg({ t: 'ok', m: 'Foto de perfil atualizada!' }); setVer(null); router.refresh();
  }

  const cheio = (fotos?.length || 0) >= MAX;
  return (
    <section className="card galeria" aria-labelledby="gal-t">
      <h3 id="gal-t">📸 Minhas fotos <small style={{ fontWeight: 400, color: 'var(--suave)' }}>({fotos?.length || 0}/{MAX})</small></h3>
      <p className="j-dica" style={{ marginTop: 0 }}>Mostre mais de você! Suas fotos aparecem no seu perfil para quem pode vê-lo.</p>
      <div className="gal-grade">
        {(fotos || []).map((f) => (
          <button type="button" key={f.id} className="gal-item" onClick={() => setVer(f)} aria-label="Abrir foto"><img loading="lazy" decoding="async" src={f.url} alt="" />{f.url === fotoAtual && <span className="gal-tag">Perfil</span>}</button>
        ))}
        {!cheio && (
          <label className={`gal-add ${ocupado ? 'ocupado' : ''}`}>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={adicionar} disabled={ocupado} />
            <span aria-hidden="true">＋</span><small>{ocupado ? 'Enviando…' : 'Adicionar foto'}</small>
          </label>
        )}
      </div>
      {msg && <p className={`msg ${msg.t}`} role="status" style={{ marginTop: 10 }}>{msg.m}</p>}
      {ver && (
        <div className="gal-modal" role="dialog" aria-modal="true" aria-label="Foto" onClick={() => setVer(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <img src={ver.url} alt="Minha foto" />
            <div className="gal-acoes">
              <button className="btn ouro mini" onClick={() => usarDePerfil(ver)} disabled={ver.url === fotoAtual}>{ver.url === fotoAtual ? 'É sua foto de perfil' : 'Usar como foto de perfil'}</button>
              <button className="btn perigo mini" onClick={() => apagar(ver)}>Apagar</button>
              <button className="btn o mini" onClick={() => setVer(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Fotos de outra pessoa (somente ver).
export function GaleriaVer({ fotos, nome }) {
  const [i, setI] = useState(null);
  useEffect(() => {
    if (i === null) return;
    const k = (e) => { if (e.key === 'Escape') setI(null); if (e.key === 'ArrowRight') setI((x) => (x + 1) % fotos.length); if (e.key === 'ArrowLeft') setI((x) => (x - 1 + fotos.length) % fotos.length); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [i, fotos.length]);
  if (!fotos?.length) return null;
  return (
    <section className="card galeria" aria-label={`Fotos de ${nome}`}>
      <h3>📸 Fotos</h3>
      <div className="gal-grade">{fotos.map((f, n) => <button type="button" key={f.id} className="gal-item" onClick={() => setI(n)} aria-label={`Abrir foto ${n + 1} de ${fotos.length}`}><img loading="lazy" decoding="async" src={f.url} alt="" /></button>)}</div>
      {i !== null && (
        <div className="gal-modal" role="dialog" aria-modal="true" aria-label={`Foto ${i + 1} de ${fotos.length}`} onClick={() => setI(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <img src={fotos[i].url} alt={`Foto ${i + 1} de ${nome}`} />
            <div className="gal-acoes">
              {fotos.length > 1 && <button className="btn o mini" onClick={() => setI((i - 1 + fotos.length) % fotos.length)}>← Anterior</button>}
              <button className="btn p mini" onClick={() => setI(null)}>Fechar</button>
              {fotos.length > 1 && <button className="btn o mini" onClick={() => setI((i + 1) % fotos.length)}>Próxima →</button>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
