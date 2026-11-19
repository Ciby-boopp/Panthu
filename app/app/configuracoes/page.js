import Link from 'next/link';
import Configuracoes from '@/components/Configuracoes';
export const metadata = { title: 'Configurações' };
export default function Page() {
  return (<>
    <h1>Configurações</h1>
    <Configuracoes />
    <p style={{ marginTop: 14 }}><Link className="btn o" href="/app/perfil">← Meu perfil (acessibilidade e privacidade)</Link></p>
  </>);
}
