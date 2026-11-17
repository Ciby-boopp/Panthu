import { criarServidor } from '@/lib/supabase/server';
import AdmAbas, { Aviso, abaDe } from '@/components/admin/AdmAbas';
import Configuracoes from '@/components/admin/v3/Configuracoes';
import Backup from '@/components/admin/v3/Backup';
import { dataHora } from '@/lib/adm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backup e configurações' };
const TIPO = { manual: 'Manual', supabase: 'Supabase', exportacao: 'Exportação' };
export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const aba = abaDe(sp, ['config', 'backup', 'protecao'], 'config');
  const sb = await criarServidor();
  let conteudo;
  if (aba === 'config') {
    const { data, error } = await sb.from('adm_config').select('chave, valor');
    conteudo = (<><Aviso erro={error} />{!error && <Configuracoes valores={Object.fromEntries((data || []).map((x) => [x.chave, x.valor]))} />}</>);
  } else if (aba === 'backup') {
    const { data, error } = await sb.from('adm_backups').select('id, tipo, observacao, criado_em').order('criado_em', { ascending: false }).limit(20);
    conteudo = (<><Aviso erro={error} /><Backup />
      <section className="card"><h3>Histórico</h3>{(data || []).length === 0 ? <p className="vazio">Nenhum registro.</p> : data.map((b) => <div className="item" key={b.id}><span><span className="tag">{TIPO[b.tipo]}</span>{b.observacao}</span><small>{dataHora(b.criado_em)}</small></div>)}</section></>);
  } else {
    conteudo = (<section className="card"><h3>Proteção e administração</h3>
      <ul style={{ marginBottom: 0 }}>
        <li>Acesso ao painel só para quem tem papel de administrador; hosts veem só os próprios eventos.</li>
        <li>Alterações de papel, bloqueio e região só passam pelo painel (bloqueadas no banco para os demais).</li>
        <li>Financeiro: lançamentos não podem ser apagados sem motivo, e tudo fica na auditoria.</li>
        <li>Recomendações no Supabase: ligue a verificação em duas etapas da sua conta e confira se os backups diários estão ativos.</li>
        <li>Guarde as chaves (service role e VAPID) apenas em variáveis secretas, nunca no código.</li>
      </ul></section>);
  }
  return (<>
    <h1 style={{ fontSize: 30 }}>Backup e configurações</h1>
    <AdmAbas base="/admin/configuracoes" itens={[['config', 'Configurações'], ['backup', 'Backup'], ['protecao', 'Proteção']]} ativo={aba} />
    {conteudo}
  </>);
}
