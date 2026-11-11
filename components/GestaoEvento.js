'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarCliente } from '@/lib/supabase/client';
import Avatar from './Avatar';
import './chat.css';
import '@/app/admin/admin.css';

function SeletorMesa({ valor, mesas, onChange, rotulo = 'Sem mesa' }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} style={{ width: 'auto', minHeight: 36, padding: '4px 10px' }} aria-label="Mesa">
      <option value="">{rotulo}</option>
      {mesas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
    </select>
  );
}

export default function GestaoEvento({ eventoId, perms, lista, mesas, rodadas, atrib }) {
  const router = useRouter();
  const sb = criarCliente();
  const [aba, setAba] = useState(perms.participantes ? 'presenca' : 'mesas');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function exec(fn, ok, mostrarErro = false) {
    setMsg(null); setOcupado(true);
    const { error } = await fn();
    setOcupado(false);
    if (error) { setMsg({ t: 'erro', m: mostrarErro ? error.message : 'Não foi possível concluir.' }); return false; }
    if (ok) setMsg({ t: 'ok', m: ok });
    router.refresh();
    return true;
  }

  const presentes = lista.filter(p => p.status === 'presente').length;
  const alternar = (p) => exec(() => sb.from('confirmacoes')
    .update({ status: p.status === 'presente' ? 'confirmado' : 'presente' })
    .eq('evento_id', eventoId).eq('usuario_id', p.usuario_id));

  async function criarMesas(e) {
    e.preventDefault(); const form = e.target; const f = new FormData(form);
    const q = parseInt(f.get('qtd'), 10);
    const l = String(f.get('lugares')).trim(); const lug = l === '' ? null : parseInt(l, 10);
    if (!(q > 0 && q <= 50)) return setMsg({ t: 'erro', m: 'Informe de 1 a 50 mesas.' });
    if (lug !== null && !(lug > 0)) return setMsg({ t: 'erro', m: 'Lugares por mesa deve ser maior que zero.' });
    const novas = Array.from({ length: q }, (_, i) => ({ evento_id: eventoId, nome: `Mesa ${mesas.length + i + 1}`, lugares: lug }));
    if (await exec(() => sb.from('mesas').insert(novas), `${q} mesa(s) criada(s).`)) form.reset();
  }
  const excluirMesa = (m) => confirm(`Excluir a ${m.nome}?`) && exec(() => sb.from('mesas').delete().eq('id', m.id));

  async function novaRodada(e) {
    e.preventDefault(); const form = e.target;
    const o = String(new FormData(form).get('orientacao')).trim();
    const numero = rodadas.reduce((mx, r) => Math.max(mx, r.numero), 0) + 1;
    if (await exec(() => sb.from('rodadas').insert({ evento_id: eventoId, numero, orientacao: o || null }), `Rodada ${numero} criada.`)) form.reset();
  }
  const ativar = (r) => exec(() => sb.rpc('ativar_rodada', { p_rodada: r.id, p_ativa: !r.ativa }),
    r.ativa ? 'Rodada encerrada.' : 'Rodada ativada. Os participantes já veem a mesa deles.', true);
  const sortear = (r) => {
    if ((atrib[r.id] || []).length && !confirm('Isso refaz a distribuição desta rodada. Continuar?')) return;
    exec(() => sb.rpc('sortear_rodada', { p_rodada: r.id }), 'Mesas sorteadas.', true);
  };
  const excluirRodada = (r) => confirm(`Excluir a rodada ${r.numero}?`) && exec(() => sb.from('rodadas').delete().eq('id', r.id));
  const mover = (r, usuarioId, mesaId) => mesaId === ''
    ? exec(() => sb.from('mesa_participantes').delete().eq('rodada_id', r.id).eq('usuario_id', usuarioId))
    : exec(() => sb.from('mesa_participantes').upsert({ rodada_id: r.id, usuario_id: usuarioId, mesa_id: mesaId }, { onConflict: 'rodada_id,usuario_id' }));

  const base = lista.some(p => p.status === 'presente') ? lista.filter(p => p.status === 'presente') : lista;

  return (<>
    <div className="abas">
      {perms.participantes && <button className={`btn mini ${aba === 'presenca' ? 'p' : 'o'}`} onClick={() => setAba('presenca')}>Presença</button>}
      {perms.mesas && <button className={`btn mini ${aba === 'mesas' ? 'p' : 'o'}`} onClick={() => setAba('mesas')}>Mesas</button>}
      {perms.mesas && <button className={`btn mini ${aba === 'rodadas' ? 'p' : 'o'}`} onClick={() => setAba('rodadas')}>Rodadas</button>}
    </div>
    {msg && <div className={`msg ${msg.t}`} role="status">{msg.m}</div>}

    {aba === 'presenca' && perms.participantes && (
      <div className="card">
        <h3>Presença</h3>
        <p><span className="tag ok">{presentes} presentes</span><span className="tag">{lista.length} confirmados</span></p>
        {lista.length === 0 && <p style={{ color: 'var(--suave)' }}>Ninguém confirmou presença ainda.</p>}
        {lista.map(p => (
          <div className="pessoa-linha" key={p.usuario_id}>
            <span className="pessoa-link"><Avatar url={p.foto_url} nome={p.nome} tam={36} />{p.nome}</span>
            <button className={`btn mini ${p.status === 'presente' ? 'o' : 'p'}`} disabled={ocupado} onClick={() => alternar(p)}>
              {p.status === 'presente' ? 'Desfazer presença' : 'Marcar presença'}</button>
          </div>
        ))}
      </div>
    )}

    {aba === 'mesas' && perms.mesas && (
      <div className="card">
        <h3>Mesas</h3>
        {mesas.length === 0 && <p style={{ color: 'var(--suave)' }}>Nenhuma mesa criada ainda.</p>}
        {mesas.map(m => (
          <div className="pessoa-linha" key={m.id}>
            <span><b>{m.nome}</b> <small style={{ color: 'var(--suave)' }}>{m.lugares ? `${m.lugares} lugares` : 'lugares automáticos'}</small></span>
            <button className="btn o mini" onClick={() => excluirMesa(m)}>Excluir</button>
          </div>
        ))}
        <form onSubmit={criarMesas} style={{ marginTop: 16 }}>
          <div className="dois">
            <div className="campo"><label htmlFor="qtd">Criar quantas mesas?</label><input id="qtd" name="qtd" type="number" min="1" max="50" required /></div>
            <div className="campo"><label htmlFor="lug">Lugares por mesa (opcional)</label><input id="lug" name="lugares" type="number" min="1" /></div>
          </div>
          <button className="btn p mini" disabled={ocupado}>+ Criar mesas</button>
        </form>
      </div>
    )}

    {aba === 'rodadas' && perms.mesas && (<>
      {rodadas.length === 0 && <div className="card vazio"><h3>Nenhuma rodada ainda</h3><p>Crie a primeira abaixo.</p></div>}
      {rodadas.map(r => {
        const at = atrib[r.id] || [];
        const naMesa = new Set(at.map(a => a.usuario_id));
        const sem = base.filter(p => !naMesa.has(p.usuario_id));
        return (
          <div className="card" key={r.id}>
            <div className="linha"><h3>Rodada {r.numero}</h3>{r.ativa && <span className="tag ok">ativa</span>}</div>
            {r.orientacao && <p style={{ whiteSpace: 'pre-line', color: 'var(--suave)' }}>{r.orientacao}</p>}
            <div className="linha" style={{ justifyContent: 'flex-start' }}>
              <button className="btn s mini" disabled={ocupado} onClick={() => sortear(r)}>Sortear mesas</button>
              <button className="btn p mini" disabled={ocupado} onClick={() => ativar(r)}>{r.ativa ? 'Encerrar rodada' : 'Ativar rodada'}</button>
              <button className="btn o mini" onClick={() => excluirRodada(r)}>Excluir</button>
            </div>
            {mesas.map(m => {
              const membros = at.filter(a => a.mesa_id === m.id);
              return (
                <div key={m.id} style={{ marginTop: 12 }}>
                  <b>{m.nome}</b> <small style={{ color: 'var(--suave)' }}>{membros.length}{m.lugares ? ` de ${m.lugares}` : ''} pessoas</small>
                  {membros.map(a => (
                    <div className="pessoa-linha" key={a.usuario_id}>
                      <span className="pessoa-link"><Avatar url={a.foto_url} nome={a.nome} tam={28} />{a.nome}</span>
                      <SeletorMesa valor={m.id} mesas={mesas} onChange={(v) => mover(r, a.usuario_id, v)} />
                    </div>
                  ))}
                </div>
              );
            })}
            {sem.length > 0 && at.length > 0 && (
              <div style={{ marginTop: 12 }}><b>Sem mesa</b>
                {sem.map(p => (
                  <div className="pessoa-linha" key={p.usuario_id}>
                    <span className="pessoa-link"><Avatar url={p.foto_url} nome={p.nome} tam={28} />{p.nome}</span>
                    <SeletorMesa valor="" mesas={mesas} rotulo="Colocar na mesa…" onChange={(v) => mover(r, p.usuario_id, v)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <form onSubmit={novaRodada} className="card">
        <div className="campo"><label htmlFor="ori">Orientação da nova rodada</label>
          <textarea id="ori" name="orientacao" placeholder="Ex.: Cada pessoa conta uma curiosidade sobre si." /></div>
        <button className="btn p mini" disabled={ocupado}>+ Criar rodada</button>
      </form>
    </>)}
  </>);
}
