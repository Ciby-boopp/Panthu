'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { criarCliente } from '@/lib/supabase/client';

// Formulário curto de "Quero ser host": o pedido chega no painel do administrador.
export default function QueroSerHost({ cidadeInicial }) {
  const router = useRouter();
  const sb = useRef(null);
  const [f, setF] = useState({ motivo: '', cidade: cidadeInicial, experiencia: '', detalhe: '', disponibilidade: '', contato: '', aceitou: false });
  const [env, setEnv] = useState(false);
  const [erro, setErro] = useState(null);
  const m = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    if (f.motivo.trim().length < 10) return setErro('Conte em pelo menos 10 letras por que você quer ser host.');
    if (f.cidade.trim().length < 2) return setErro('Informe a cidade onde você ajudaria.');
    if (!f.experiencia) return setErro('Responda se você já organizou encontros ou grupos.');
    if (!f.disponibilidade) return setErro('Escolha quando você poderia ajudar.');
    if (!f.aceitou) return setErro('Para continuar, aceite as diretrizes da comunidade.');
    setEnv(true); setErro(null);
    const { error } = await (sb.current ||= criarCliente()).rpc('host_pedir', {
      p_motivo: f.motivo, p_cidade: f.cidade, p_experiencia: f.experiencia, p_detalhe: f.detalhe,
      p_disponibilidade: f.disponibilidade, p_contato: f.contato, p_aceitou: f.aceitou,
    });
    setEnv(false);
    if (error) return setErro(error.message && error.message.length < 110 ? error.message : 'Não foi possível enviar agora. Tente de novo em instantes.');
    router.refresh();
  }

  return (
    <form className="card" onSubmit={enviar}>
      <div className="campo"><label htmlFor="h-motivo">1. Por que você quer ser host?</label>
        <textarea id="h-motivo" rows={4} maxLength={600} value={f.motivo} onChange={m('motivo')} placeholder="Conte com suas palavras" required /></div>
      <div className="campo"><label htmlFor="h-cidade">2. Em qual cidade você ajudaria?</label>
        <input id="h-cidade" maxLength={80} value={f.cidade} onChange={m('cidade')} required /></div>
      <fieldset className="campo" style={{ border: 0, padding: 0 }}>
        <legend>3. Você já organizou encontros ou grupos antes?</legend>
        <label style={{ marginRight: 16 }}><input type="radio" name="exp" value="sim" checked={f.experiencia === 'sim'} onChange={m('experiencia')} /> Sim</label>
        <label><input type="radio" name="exp" value="nao" checked={f.experiencia === 'nao'} onChange={m('experiencia')} /> Não</label>
      </fieldset>
      {f.experiencia === 'sim' && (
        <div className="campo"><label htmlFor="h-det">Conte rapidinho como foi (opcional)</label>
          <input id="h-det" maxLength={400} value={f.detalhe} onChange={m('detalhe')} placeholder="Ex.: grupo de corrida, clube do livro..." /></div>
      )}
      <div className="campo"><label htmlFor="h-disp">4. Quando você poderia ajudar?</label>
        <select id="h-disp" value={f.disponibilidade} onChange={m('disponibilidade')} required>
          <option value="">Escolha…</option>
          <option value="semana_noite">Durante a semana, à noite</option>
          <option value="fim_de_semana">Nos fins de semana</option>
          <option value="qualquer_dia">Qualquer dia</option>
        </select></div>
      <div className="campo"><label htmlFor="h-cont">5. WhatsApp para contato (opcional)</label>
        <input id="h-cont" maxLength={60} value={f.contato} onChange={m('contato')} inputMode="tel" placeholder="Só a equipe do Panthu vê" /></div>
      <label style={{ display: 'block', margin: '10px 0' }}><input type="checkbox" checked={f.aceitou} onChange={m('aceitou')} /> Li e aceito as <Link href="/diretrizes" target="_blank">diretrizes da comunidade</Link>.</label>
      {erro && <div className="msg erro" role="status">{erro}</div>}
      <button className="btn p" disabled={env}>{env ? 'Enviando…' : 'Enviar pedido'}</button>
    </form>
  );
}
