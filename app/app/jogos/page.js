import Jogos from '@/components/jogos/Jogos';
export const metadata = { title: 'Jogos' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }) {
  const { convite, jogo } = await searchParams;
  return (<>
    <h1 style={{ fontSize: 30, color: 'var(--ouro)' }}>🎮 Jogos</h1>
    <p style={{ color: 'var(--suave)' }}>Divirta-se e conecte-se ainda mais! Ganhe pontos e brindes jogando.</p>
    <Jogos conviteId={typeof convite === 'string' ? convite : null} jogoInicial={typeof jogo === 'string' ? jogo : null} />
  </>);
}
