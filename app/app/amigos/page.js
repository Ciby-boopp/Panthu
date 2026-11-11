import Link from 'next/link';
import { criarServidor } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import AmigoBotao from '@/components/AmigoBotao';
import '@/components/chat.css';
export const dynamic = 'force-dynamic';
export default async function Amigos() {
  const sb = await criarServidor();
  const { data: { user } } = await sb.auth.getUser();
  const { data: lista, error } = await sb.rpc('meus_amigos');
  return (<>
    <p><Link href="/app/perfil">← Meu perfil</Link></p>
    <h1 style={{ fontSize: 32 }}>Meus amigos</h1>
    <p style={{ color: 'var(--suave)' }}>Pessoas que você salvou para encontrar de novo. Elas não são avisadas e nada é compartilhado com elas.</p>
    {error && <div className="msg erro">Não foi possível carregar a lista. Confira se o SQL das novas funcionalidades foi executado no Supabase.</div>}
    <div className="card">
      {!error && (!lista || !lista.length) && <p className="vazio">Você ainda não salvou ninguém. Abra o perfil de um participante e toque em “Salvar amigo”.</p>}
      {(lista || []).map(p => (
        <div className="pessoa-linha" key={p.amigo_id}>
          <Link className="pessoa-link" href={`/app/pessoa/${p.amigo_id}`}><Avatar url={p.foto_url} nome={p.nome} tam={40} />{p.nome}</Link>
          <AmigoBotao id={p.amigo_id} euId={user.id} inicial lista />
        </div>))}
    </div>
  </>);
}
