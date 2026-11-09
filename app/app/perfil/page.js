import { criarServidor } from '@/lib/supabase/server';
import PerfilForm from '@/components/PerfilForm';
import { quando } from '@/lib/util';
export const dynamic = 'force-dynamic';
const rotulo = { confirmado: 'Confirmado', cancelado: 'Cancelado', presente: 'Participou' };
export default async function Perfil() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: perfil } = await sb.from('perfis').select('id, nome, telefone, email').eq('id', user.id).single();
  const { data: hist } = await sb.from('confirmacoes').select('status, eventos(id, nome, inicio)').eq('usuario_id', user.id).order('criado_em', { ascending: false });
  return (<>
    <h1 style={{ fontSize: 32 }}>Meu perfil</h1>
    <PerfilForm perfil={perfil} />
    <div className="card"><h3>Meu histórico</h3>
      {(!hist || !hist.length) && <p style={{ color: 'var(--suave)' }}>Você ainda não confirmou presença em nenhum encontro.</p>}
      {(hist || []).filter(h => h.eventos).map((h, i) => (
        <div className="item" key={i}><span>{h.eventos.nome}<small>{quando(h.eventos.inicio)}</small></span>
          <span className={`tag ${h.status !== 'cancelado' ? 'ok' : ''}`}>{rotulo[h.status] || h.status}</span></div>
      ))}
    </div>
  </>);
}
