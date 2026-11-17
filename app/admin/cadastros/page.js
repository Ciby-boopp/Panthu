import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas from '@/components/admin/AdmAbas';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cadastros e acessos' };
export default async function Page() {
  const sb = await criarServidor();
  let { data: novos, error } = await sb.from('perfis').select('id, nome, email, cidade, papel, criado_em, onboarding_em, ativo, bloqueado').order('criado_em', { ascending: false }).limit(30);
  if (error) ({ data: novos } = await sb.from('perfis').select('id, nome, email, papel, criado_em, ativo, bloqueado').order('criado_em', { ascending: false }).limit(30));
  const { data: sessoes } = await sb.from('sessoes').select('iniciou_em, ultima_atividade, dispositivo, navegador, perfis(id, nome)').order('ultima_atividade', { ascending: false }).limit(30);
  return (<>
    <h1 style={{ fontSize: 30 }}>Usuários</h1>
    <AdmAbas itens={[['/admin/usuarios', 'Todos os usuários'], ['/admin/cadastros', 'Cadastros e acessos']]} ativo="/admin/cadastros" />
    <section className="card"><h3>Últimos cadastros</h3>
      {(novos || []).map((u) => (
        <div className="item" key={u.id}>
          <span><Link href={`/admin/usuarios/${u.id}`}><b>{u.nome}</b></Link> <span className="tag">{u.papel}</span>{u.bloqueado && <span className="tag erro">bloqueado</span>}{!u.ativo && <span className="tag">inativo</span>}
            <small>{u.email}{u.cidade ? ` · ${u.cidade}` : ''}</small></span>
          <span style={{ textAlign: 'right' }}><small>{dataHora(u.criado_em)}</small>{'onboarding_em' in u && <span className={`tag ${u.onboarding_em ? 'ok' : ''}`}>{u.onboarding_em ? 'cadastro completo' : 'falta boas-vindas'}</span>}</span>
        </div>
      ))}
    </section>
    <section className="card"><h3>Acessos recentes</h3>
      {(sessoes || []).length === 0 ? <p className="vazio">Nenhum acesso registrado.</p> : sessoes.map((s, i) => (
        <div className="item" key={i}><span>{s.perfis?.nome || 'Pessoa'}<small>{[s.dispositivo, s.navegador].filter(Boolean).join(' · ') || 'dispositivo não informado'}</small></span><small>{dataHora(s.ultima_atividade)}</small></div>
      ))}
    </section>
  </>);
}
