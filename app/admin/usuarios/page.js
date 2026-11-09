import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Usuarios({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp?.q || '').replace(/[,()%*\\]/g, '').trim();
  const papel = ['host', 'participante', 'admin'].includes(sp?.papel) ? sp.papel : '';
  const sb = await criarServidor();
  let query = sb.from('perfis').select('id, nome, email, telefone, papel, ativo, bloqueado').order('criado_em', { ascending: false }).limit(100);
  if (q) query = query.or(`nome.ilike.%${q}%,email.ilike.%${q}%`);
  if (papel) query = query.eq('papel', papel);
  const { data } = await query;
  const aba = (v, t) => <Link href={`/admin/usuarios?papel=${v}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`btn mini ${papel === v ? 'p' : 'o'}`}>{t}</Link>;
  return (<>
    <h1 style={{ fontSize: 30 }}>Usuários</h1>
    <form className="card" action="/admin/usuarios">
      <div className="campo"><label htmlFor="q">Buscar por nome ou e-mail</label><input id="q" name="q" defaultValue={q} /></div>
      {papel && <input type="hidden" name="papel" value={papel} />}
      <button className="btn p mini">Buscar</button>
    </form>
    <div className="linha" style={{ justifyContent: 'flex-start' }}>{aba('', 'Todos')}{aba('participante', 'Participantes')}{aba('host', 'Hosts')}</div>
    {(!data || !data.length) && <div className="card vazio"><h3>Ninguém encontrado</h3></div>}
    {(data || []).map(u => (
      <Link key={u.id} href={`/admin/usuarios/${u.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <b>{u.nome}</b> <span className={`tag ${u.papel !== 'participante' ? 'ok' : ''}`}>{u.papel}</span>
        {u.bloqueado && <span className="tag" style={{ background: '#FFE1E8', color: '#8A1033' }}>bloqueado</span>}
        {!u.ativo && <span className="tag">inativo</span>}<br />
        <small style={{ color: 'var(--suave)' }}>{u.email} {u.telefone ? `· ${u.telefone}` : ''}</small>
      </Link>
    ))}
  </>);
}
