import { notFound } from 'next/navigation';
import { criarServidor } from '@/lib/supabase/server';
import UsuarioAcoes from '@/components/admin/UsuarioAcoes';
import { quando } from '@/lib/util';
export const dynamic = 'force-dynamic';
const rotulo = { confirmado: 'Confirmado', cancelado: 'Cancelado', presente: 'Participou' };
export default async function Usuario({ params }) {
  const { id } = await params;
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('*').eq('id', id).single();
  if (!perfil) notFound();
  const { data: perm } = await sb.from('host_permissoes').select('*').eq('host_id', id).maybeSingle();
  const { data: eventos } = await sb.from('eventos').select('id, nome').order('inicio', { ascending: false }).limit(50);
  const { data: v } = await sb.from('evento_hosts').select('evento_id').eq('host_id', id);
  const { data: hist } = await sb.from('confirmacoes').select('status, eventos(nome, inicio)').eq('usuario_id', id).order('criado_em', { ascending: false });
  return (<>
    <h1 style={{ fontSize: 30 }}>{perfil.nome}</h1>
    <div className="card">
      <span className={`tag ${perfil.papel !== 'participante' ? 'ok' : ''}`}>{perfil.papel}</span>
      {perfil.bloqueado && <span className="tag" style={{ background: '#FFE1E8', color: '#8A1033' }}>bloqueado</span>}
      {!perfil.ativo && <span className="tag">inativo</span>}
      <p>{perfil.email}<br />{perfil.telefone}<br /><small style={{ color: 'var(--suave)' }}>Cadastro: {quando(perfil.criado_em)}</small></p>
    </div>
    <UsuarioAcoes perfil={perfil} perm={perm} eventos={eventos || []} vinculos={(v || []).map(x => x.evento_id)} souEu={user.id === id} />
    <div className="card"><h3>Histórico de eventos</h3>
      {(!hist || !hist.length) && <p style={{ color: 'var(--suave)' }}>Nenhuma participação ainda.</p>}
      {(hist || []).filter(h => h.eventos).map((h, i) => (
        <div className="item" key={i}><span>{h.eventos.nome}<small>{quando(h.eventos.inicio)}</small></span><span className={`tag ${h.status !== 'cancelado' ? 'ok' : ''}`}>{rotulo[h.status] || h.status}</span></div>
      ))}
    </div>
  </>);
}
