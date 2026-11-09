'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import { auditar } from '@/lib/util';

const PERMS = [
  ['ver_participantes', 'Ver participantes confirmados'],
  ['gerenciar_mesas', 'Organizar mesas e rodadas'],
  ['ver_dinamicas', 'Ver jogos e dinâmicas'],
  ['registrar_ocorrencias', 'Registrar ocorrências']
];

export default function UsuarioAcoes({ perfil, perm, eventos, vinculos, souEu }) {
  const router = useRouter();
  const sb = criarCliente();
  const [msg, setMsg] = useState(null);
  const [papel, setPapel] = useState(perfil.papel);
  const [p, setP] = useState({
    ver_participantes: perm?.ver_participantes ?? true, gerenciar_mesas: perm?.gerenciar_mesas ?? true,
    ver_dinamicas: perm?.ver_dinamicas ?? true, registrar_ocorrencias: perm?.registrar_ocorrencias ?? false
  });
  const [vinc, setVinc] = useState(new Set(vinculos));
  const ok = (m) => { setMsg({ t: 'ok', m }); router.refresh(); };
  const erro = (m = 'Não foi possível salvar.') => setMsg({ t: 'erro', m });

  async function salvarPapel() {
    setMsg(null);
    const { error } = await sb.from('perfis').update({ papel }).eq('id', perfil.id);
    if (error) return erro();
    if (papel === 'host') await sb.from('host_permissoes').upsert({ host_id: perfil.id }, { onConflict: 'host_id', ignoreDuplicates: true });
    ok('Papel atualizado.');
  }
  async function mudar(campo, valor, pergunta) {
    if (pergunta && !confirm(pergunta)) return;
    setMsg(null);
    const { error } = await sb.from('perfis').update({ [campo]: valor }).eq('id', perfil.id);
    error ? erro() : ok('Atualizado.');
  }
  async function salvarPermissoes() {
    setMsg(null);
    const { error } = await sb.from('host_permissoes').upsert({ host_id: perfil.id, ...p }, { onConflict: 'host_id' });
    if (error) return erro();
    await auditar(sb, 'alterou_permissoes_host', { host: perfil.id, ...p });
    ok('Permissões salvas.');
  }
  async function salvarVinculos() {
    setMsg(null);
    const antes = new Set(vinculos);
    const add = [...vinc].filter(id => !antes.has(id)).map(evento_id => ({ evento_id, host_id: perfil.id }));
    const rem = [...antes].filter(id => !vinc.has(id));
    if (add.length) { const { error } = await sb.from('evento_hosts').insert(add); if (error) return erro(); }
    if (rem.length) { const { error } = await sb.from('evento_hosts').delete().eq('host_id', perfil.id).in('evento_id', rem); if (error) return erro(); }
    await auditar(sb, 'vinculou_host_eventos', { host: perfil.id, adicionados: add.length, removidos: rem.length });
    ok('Eventos vinculados atualizados.');
  }
  const alternar = (id) => setVinc(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (perfil.papel === 'admin') return <div className="card"><p>Esta conta é de administrador. Mudanças nela só pelo banco de dados.</p></div>;

  return (<>
    {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}
    <div className="card">
      <h3>Papel</h3>
      <div className="campo"><select value={papel} onChange={e => setPapel(e.target.value)} disabled={souEu} aria-label="Papel">
        <option value="participante">Participante</option><option value="host">Host</option></select></div>
      <button className="btn p mini" disabled={souEu || papel === perfil.papel} onClick={salvarPapel}>Salvar papel</button>
    </div>
    <div className="card">
      <h3>Acesso</h3>
      <div className="linha" style={{ justifyContent: 'flex-start' }}>
        <button className="btn o mini" disabled={souEu} onClick={() => mudar('ativo', !perfil.ativo)}>{perfil.ativo ? 'Desativar acesso' : 'Ativar acesso'}</button>
        <button className={`btn mini ${perfil.bloqueado ? 's' : 'perigo'}`} disabled={souEu}
          onClick={() => mudar('bloqueado', !perfil.bloqueado, perfil.bloqueado ? null : `Bloquear ${perfil.nome}? A pessoa perde o acesso ao Panthu.`)}>
          {perfil.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>
      </div>
      {souEu && <p style={{ color: 'var(--suave)' }}>Você não pode alterar o próprio acesso.</p>}
    </div>
    {perfil.papel === 'host' && (<>
      <div className="card">
        <h3>Permissões do Host</h3>
        {PERMS.map(([k, t]) => <p key={k}><label><input type="checkbox" checked={p[k]} onChange={e => setP({ ...p, [k]: e.target.checked })} />{t}</label></p>)}
        <button className="btn p mini" onClick={salvarPermissoes}>Salvar permissões</button>
      </div>
      <div className="card">
        <h3>Eventos sob responsabilidade</h3>
        {eventos.length === 0 && <p style={{ color: 'var(--suave)' }}>Crie um evento para vincular.</p>}
        {eventos.map(ev => <p key={ev.id}><label><input type="checkbox" checked={vinc.has(ev.id)} onChange={() => alternar(ev.id)} />{ev.nome}</label></p>)}
        <button className="btn p mini" onClick={salvarVinculos}>Salvar vínculos</button>
      </div>
    </>)}
  </>);
}
