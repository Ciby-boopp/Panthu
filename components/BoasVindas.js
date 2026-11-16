'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import ChipsSelect from './ChipsSelect';
import { HOBBIES, INTERESSES, PROCURA, VERSAO_TERMOS } from '@/lib/interesses';

// Cadastro inteligente: aparece uma vez, depois do primeiro acesso. Também serve para editar os gostos (modo "editar").
export default function BoasVindas({ perfil, editar = false }) {
  const router = useRouter();
  const sbRef = useRef(null);
  const [cidade, setCidade] = useState(perfil.cidade || '');
  const [interesses, setInteresses] = useState(perfil.interesses || []);
  const [hobbies, setHobbies] = useState(perfil.hobbies || []);
  const [procura, setProcura] = useState(perfil.procura || []);
  const [regras, setRegras] = useState(!!perfil.regras_aceitas_em);
  const [priv, setPriv] = useState(!!perfil.privacidade_aceita_em);
  const [codigo, setCodigo] = useState('');
  const [msg, setMsg] = useState(null);
  const [c, setC] = useState(false);

  useEffect(() => { try { const r = localStorage.getItem('panthu_ref'); if (r) setCodigo(r); } catch {} }, []);

  async function salvar(e) {
    e.preventDefault(); setMsg(null);
    if (!editar && (!regras || !priv)) { setMsg('Para continuar, aceite as regras de convivência e a política de privacidade.'); return; }
    setC(true);
    const sb = (sbRef.current ||= criarCliente());
    try {
      if (!editar && codigo.trim()) {
        const { data } = await sb.rpc('usar_codigo_indicacao', { p_codigo: codigo });
        try { localStorage.removeItem('panthu_ref'); } catch {}
        if (data === 'invalido') setMsg('O código de indicação não existe. Seguimos sem ele.');
      }
      const agora = new Date().toISOString();
      const dados = { cidade: cidade.trim() || null, interesses, hobbies, procura };
      if (!editar) Object.assign(dados, { regras_aceitas_em: agora, privacidade_aceita_em: agora, versao_termos: VERSAO_TERMOS, onboarding_em: agora });
      const { error } = await sb.from('perfis').update(dados).eq('id', perfil.id);
      if (error) throw error;
      if (editar) { setMsg('Gostos atualizados!'); router.refresh(); setC(false); return; }
      router.replace('/app'); router.refresh();
    } catch {
      setMsg('Não foi possível salvar agora. Se o problema continuar, avise o administrador (o arquivo supabase/pontos-favoritos-lgpd.sql precisa estar rodado).');
      setC(false);
    }
  }

  return (
    <form onSubmit={salvar} className={editar ? 'card' : ''}>
      {!editar && <><h1 style={{ fontSize: 30 }}>Bem-vindo ao Panthu!</h1>
        <p style={{ color: 'var(--suave)' }}>Conte um pouco sobre você para sugerirmos encontros e pessoas que combinam com o seu jeito. Leva 1 minuto.</p></>}
      {editar && <h3>Meus gostos</h3>}
      <div className="campo"><label htmlFor="cidade">Em que cidade você mora?</label><input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={80} placeholder="Ex.: Campinas" autoComplete="address-level2" /></div>
      <ChipsSelect rotulo="Seus interesses" opcoes={INTERESSES} valor={interesses} onChange={setInteresses} />
      <ChipsSelect rotulo="Seus hobbies" opcoes={HOBBIES} valor={hobbies} onChange={setHobbies} />
      <ChipsSelect rotulo="O que você procura na comunidade?" opcoes={PROCURA} valor={procura} onChange={setProcura} />
      {!editar && <>
        <div className="campo"><label htmlFor="cod">Tem um código de indicação? (opcional)</label><input id="cod" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={12} autoCapitalize="characters" autoComplete="off" /></div>
        <div className="card" style={{ margin: '14px 0' }}>
          <p style={{ marginTop: 0 }}><b>O Panthu é um espaço de amizade, socialização e respeito.</b> Não é um aplicativo de paquera ou de relacionamento.</p>
          <label style={{ display: 'block', margin: '8px 0' }}><input type="checkbox" checked={regras} onChange={(e) => setRegras(e.target.checked)} />Li e aceito as <Link href="/regras" target="_blank">regras de convivência</Link>.</label>
          <label style={{ display: 'block', margin: '8px 0' }}><input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} />Li e concordo com o uso dos meus dados conforme a <Link href="/privacidade" target="_blank">política de privacidade</Link> (LGPD).</label>
        </div></>}
      {msg && <div className={`msg ${/Não|Para|código/.test(msg) ? 'erro' : 'ok'}`} role="status">{msg}</div>}
      <button className="btn p" disabled={c}>{c ? 'Salvando…' : editar ? 'Salvar meus gostos' : 'Entrar no Panthu'}</button>
    </form>
  );
}
