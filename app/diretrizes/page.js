import BotaoVoltar from '@/components/BotaoVoltar';
import DiretrizesTexto from '@/components/DiretrizesTexto';
import { criarServidor } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diretrizes da comunidade' };
export default async function Page() {
  const sb = await criarServidor();
  const { data, error } = await sb.from('diretrizes_comunidade').select('id, titulo, conteudo').eq('visivel', true).order('ordem');
  const { data: { user } } = await sb.auth.getUser();
  return (
    <main className="estreito">
      <p><BotaoVoltar href={user ? '/app' : '/entrar'}>← Voltar</BotaoVoltar></p>
      <h1 style={{ fontSize: 32 }}>Diretrizes da comunidade</h1>
      <p style={{ color: 'var(--suave)' }}>Combinados para o Panthu ser um lugar de amizade e respeito. Valem para encontros, bate-papo, grupos e jogos.</p>
      {(error || !data?.length) && <div className="card vazio"><p>As diretrizes ainda não foram publicadas.</p></div>}
      {(data || []).map((s) => (
        <section className="card" key={s.id}><h2 style={{ fontSize: 21, marginTop: 0 }}>{s.titulo}</h2><DiretrizesTexto texto={s.conteudo} /></section>
      ))}
    </main>
  );
}
