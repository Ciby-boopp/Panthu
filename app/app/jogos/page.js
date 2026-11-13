import Jogos from '@/components/jogos/Jogos';
export const metadata = { title: 'Jogos' };
export default function Page() {
  return (<>
    <h1 style={{ fontSize: 32 }}>Jogos</h1>
    <p style={{ color: 'var(--suave)' }}>Uma pausa para jogar cartas, sozinho ou com um amigo.</p>
    <Jogos />
  </>);
}
