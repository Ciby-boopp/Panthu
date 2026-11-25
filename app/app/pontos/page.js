import { criarServidor } from '@/lib/supabase/server';
import BotaoVoltar from '@/components/BotaoVoltar';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus pontos' };
const fmt = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export default async function Page() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: resumo, error } = await sb.rpc('pontos_resumo');
  const [{ data: regras }, { data: lanc }, { data: cupons }, { data: brindes }] = await Promise.all([
    sb.from('pontos_regras').select('*').eq('ativo', true).order('ordem'),
    sb.from('pontos_lancamentos').select('id, pontos, criado_em, pontos_regras(nome)').eq('usuario_id', user.id).order('criado_em', { ascending: false }).limit(15),
    sb.from('pontos_cupons').select('id, codigo, status, criado_em, pontos_brindes(nome, descricao)').eq('usuario_id', user.id).order('criado_em', { ascending: false }),
    sb.from('pontos_brindes').select('id, nome, meta').eq('ativo', true).order('meta'),
  ]);
  const r = resumo?.[0] || { total: 0 };
  const total = Number(r.total || 0);
  const meta = r.proxima_meta ? Number(r.proxima_meta) : null;
  const pct = meta ? Math.min(100, Math.round((total / meta) * 100)) : 100;
  return (<>
    <p><BotaoVoltar href="/app/perfil">← Voltar</BotaoVoltar></p>
    <h1 style={{ fontSize: 32 }}>Meus pontos</h1>
    {error && <p className="msg erro">Pontos indisponíveis. Rode o arquivo supabase/pontos-favoritos-lgpd.sql no Supabase.</p>}
    <div className="card">
      <div className="num" style={{ color: 'var(--ouro)' }}>{total} <small style={{ fontSize: 16, color: 'var(--suave)' }}>pontos</small></div>
      <div className="pontos-barra" style={{ marginTop: 10 }}>
        <div className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso até o próximo brinde"><i style={{ width: `${pct}%` }} /></div>
        <b>{pct}%</b>
      </div>
      <p style={{ color: 'var(--suave)', marginBottom: 0 }}>{meta ? `Faltam ${meta - total} pontos para: ${r.proxima_nome}.` : 'Você alcançou todos os brindes disponíveis. Parabéns!'}</p>
    </div>
    {(cupons || []).length > 0 && (
      <section className="card" aria-label="Meus cupons de brinde">
        <h3>🎁 Meus cupons</h3>
        {cupons.map((c) => (
          <div className="item" key={c.id} style={{ alignItems: 'center' }}>
            <span><b>{c.pontos_brindes?.nome}</b><small>{c.pontos_brindes?.descricao}</small></span>
            <span style={{ textAlign: 'right' }}><span className="j-codigo" style={{ fontSize: 22, letterSpacing: '.08em' }}>{c.codigo}</span><br /><span className={`tag ${c.status === 'disponivel' ? 'ok' : ''}`}>{c.status === 'disponivel' ? 'Disponível' : c.status === 'usado' ? 'Já usado' : 'Cancelado'}</span></span>
          </div>
        ))}
        <small style={{ color: 'var(--suave)' }}>Mostre o código a um host em um encontro para retirar o brinde.</small>
      </section>
    )}
    <section className="card" aria-label="Como ganhar pontos">
      <h3>Como ganhar pontos</h3>
      {(regras || []).map((g) => (
        <div className="item" key={g.codigo}><span>{g.nome}<small>{g.descricao}</small></span><b style={{ color: 'var(--ouro)' }}>+{g.pontos}</b></div>
      ))}
      {(brindes || []).length > 0 && <p style={{ color: 'var(--suave)', marginBottom: 0 }}>Brindes: {brindes.map((b) => `${b.nome} (${b.meta} pts)`).join(' · ')}</p>}
    </section>
    <section className="card" aria-label="Últimos pontos">
      <h3>Últimos pontos</h3>
      {(lanc || []).length === 0 ? <p className="vazio" style={{ padding: 16 }}>Você ainda não ganhou pontos. Complete o seu perfil e jogue!</p> :
        lanc.map((l) => <div className="item" key={l.id}><span>{l.pontos_regras?.nome}<small>{fmt(l.criado_em)}</small></span><b>+{l.pontos}</b></div>)}
    </section>
  </>);
}
