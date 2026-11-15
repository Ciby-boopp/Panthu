import Jogos from '@/components/jogos/Jogos';
export const metadata = { title: 'Jogos' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }) {
  const { convite } = await searchParams;
  return (<>
    <h1 style={{ fontSize: 32 }}>Jogos</h1>
    <p style={{ color: 'var(--suave)' }}>Uma pausa para jogar cartas, sozinho ou com um amigo. Ganhe pontos e brindes jogando.</p>
    <Jogos conviteId={typeof convite === 'string' ? convite : null} />
  </>);
}
