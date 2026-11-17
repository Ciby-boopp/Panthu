import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Permissões e LGPD' };
const PERMS = [['ver_participantes', 'Participantes'], ['gerenciar_mesas', 'Mesas'], ['ver_dinamicas', 'Dinâmicas'], ['registrar_ocorrencias', 'Ocorrências']];
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['permissoes', 'lgpd'], 'permissoes');
  const sb = await criarServidor();
  let conteudo;
  if (aba === 'permissoes') {
    const { data: pessoas } = await sb.from('perfis').select('id, nome, email, papel, ativo').in('papel', ['admin', 'host']).order('papel').order('nome');
    const { data: perms } = await sb.from('host_permissoes').select('*');
    const mapa = Object.fromEntries((perms || []).map((p) => [p.host_id, p]));
    conteudo = (<section className="card"><h3>Quem tem acesso especial</h3>
      {(pessoas || []).map((p) => (
        <div className="item" key={p.id}><span><Link href={`/admin/usuarios/${p.id}`}><b>{p.nome}</b></Link> <span className={`tag ${p.papel === 'admin' ? 'ok' : ''}`}>{p.papel}</span>{!p.ativo && <span className="tag erro">inativo</span>}<small>{p.email}</small></span>
          <span>{p.papel === 'admin' ? <span className="tag ok">acesso total</span> : PERMS.map(([k, t]) => <span key={k} className={`tag ${mapa[p.id]?.[k] ? 'ok' : ''}`}>{t}: {mapa[p.id]?.[k] ? 'sim' : 'não'}</span>)}</span></div>
      ))}
      <p style={{ color: 'var(--suave)', marginBottom: 0 }}>Para mudar permissões, abra a pessoa em Usuários. Toda mudança fica no histórico de <Link href="/admin/auditoria">Auditoria</Link>.</p></section>);
  } else {
    const { data: l, error } = await sb.rpc('adm_lgpd');
    conteudo = (<>
      <Aviso erro={error} />
      {l && (<>
        <div className="stats">
          <div className="stat"><div className="num">{l.contas}</div><span>Contas ativas</span></div>
          <div className="stat"><div className="num">{l.com_aceite_privacidade}</div><span>Aceitaram a privacidade</span></div>
          <div className="stat"><div className="num">{l.sem_aceite}</div><span>Sem aceite ainda</span></div>
          <div className="stat"><div className="num">{l.exclusoes}</div><span>Contas excluídas a pedido</span><small>{l.exclusoes_30d} nos últimos 30 dias</small></div>
          <div className="stat"><div className="num">{l.exportacoes_30d}</div><span>Exportações de dados (30 dias)</span></div>
          <div className="stat"><div className="num">{l.compartilhando_localizacao}</div><span>Compartilhando localização</span></div>
        </div>
        <section className="card"><h3>Como o Panthu cumpre a LGPD</h3>
          <ul style={{ marginBottom: 0 }}><li>Consentimento registrado com data no cadastro (regras e privacidade).</li><li>Cada pessoa baixa os próprios dados e exclui a conta pelo Perfil.</li><li>Exclusões e exportações ficam registradas na auditoria, sem dados pessoais.</li><li>Telefone e e-mail não aparecem para outros usuários.</li></ul></section></>)}
    </>);
  }
  return (<>
    <h1 style={{ fontSize: 30 }}>Auditoria e segurança</h1>
    <AdmAbas base="/admin/seguranca" itens={[['/admin/auditoria', 'Histórico'], ['permissoes', 'Permissões'], ['lgpd', 'LGPD']]} ativo={aba} />
    {conteudo}
  </>);
}
