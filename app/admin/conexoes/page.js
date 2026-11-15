import { criarServidor } from '@/lib/supabase/server';
import AtualizarSozinho from '@/components/AtualizarSozinho';
export const dynamic = 'force-dynamic';

const num = (n) => Number(n || 0).toLocaleString('pt-BR');
const hora = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const diaCurto = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const minutos = (d) => Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));

function Barras({ itens, valor, rotulo, fino }) {
  const max = Math.max(1, ...itens.map(valor));
  return (<div className={`barras ${fino ? 'fino' : ''}`}>
    {itens.map((x, i) => (<div className="barra" key={i} title={`${rotulo(x)}: ${valor(x)}`}>
      {!fino && <b>{valor(x)}</b>}<i style={{ height: `${(valor(x) / max) * 100}%` }} />{rotulo(x)}
    </div>))}
  </div>);
}

export default async function Conexoes() {
  const sb = await criarServidor();
  const { data: c, error } = await sb.rpc('adm_conexoes');
  if (error || !c) {
    return (<><h1 style={{ fontSize: 30 }}>Conexões</h1>
      <div className="card"><p>Não foi possível carregar. Rode <b>supabase/adm-fase1.sql</b> no Supabase e recarregue.</p>
        <small style={{ color: 'var(--suave)' }}>Detalhe técnico: {error?.message || 'sem resposta'}</small></div></>);
  }
  return (<>
    <AtualizarSozinho segundos={30} />
    <h1 style={{ fontSize: 30 }}>Conexões</h1>
    <p className="vazio-nota">Atualiza sozinho a cada 30 segundos. Online = atividade nos últimos 5 minutos.</p>

    <div className="stats">
      <div className="stat"><div className="num">{num((c.online || []).length)}</div><span>Online agora</span></div>
      <div className="stat"><div className="num">{num(c.sessoes_total)}</div><span>Sessões registradas</span></div>
    </div>

    <div className="card"><h3>Quem está online</h3>
      {(!c.online || !c.online.length) && <p className="vazio-nota">Ninguém conectado neste momento.</p>}
      <div className="tabela-rol">
        {(c.online || []).map(u => (
          <div className="item" key={u.usuario_id}>
            <span>{u.nome}<small>{u.cidade || 'Sem cidade'} · entrou às {hora(u.iniciou_em)} · última atividade há {minutos(u.ultima_atividade)} min</small></span>
            <span className="tag">{[u.dispositivo, u.navegador].filter(Boolean).join(' · ') || '—'}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="adm-duas">
      <div className="card"><h3>Online por cidade</h3>
        {(!c.online_por_cidade || !c.online_por_cidade.length) && <p className="vazio-nota">Sem conexões agora.</p>}
        {(c.online_por_cidade || []).map(x => <div className="linha-rank" key={x.cidade}><span>{x.cidade}</span><b>{num(x.online)}</b></div>)}
      </div>
      <div className="card"><h3>Dispositivos e navegadores (30 dias)</h3>
        {(!c.dispositivos || !c.dispositivos.length) && <p className="vazio-nota">Sem sessões registradas ainda.</p>}
        {(c.dispositivos || []).map(x => <div className="linha-rank" key={'d' + x.nome}><span>{x.nome}</span><b>{num(x.total)}</b></div>)}
        {(c.navegadores || []).map(x => <div className="linha-rank" key={'n' + x.nome}><span>{x.nome}</span><b>{num(x.total)}</b></div>)}
      </div>
    </div>

    <div className="card"><h3>Acessos por dia (usuários distintos, 14 dias)</h3>
      <Barras itens={c.por_dia || []} valor={x => x.usuarios} rotulo={x => diaCurto(x.dia)} fino />
    </div>
    <div className="card"><h3>Horários de maior movimentação (sessões iniciadas, 7 dias, horário de Brasília)</h3>
      <Barras itens={c.por_hora || []} valor={x => x.acessos} rotulo={x => String(x.hora)} fino />
    </div>
  </>);
}
