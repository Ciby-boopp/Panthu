import Link from 'next/link';
import Proximo from '@/components/Proximo';
export default function Page() {
  return (<>
    <div className="linha"><h1 style={{ fontSize: 32 }}>Perto de você</h1><Link className="btn s mini" href="/app/amigos">Meus amigos</Link></div>
    <p style={{ color: 'var(--suave)' }}>Descubra encontros e pessoas por perto.</p>
    <Proximo />
  </>);
}
