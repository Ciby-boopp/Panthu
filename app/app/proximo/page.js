import Proximo from '@/components/Proximo';
import SubAbas from '@/components/SubAbas';
export default function Page() {
  return (<>
    <h1 style={{ fontSize: 32 }}>Perto de você</h1>
    <SubAbas itens={[['/app/proximo', 'Perto de você'], ['/app/amigos', 'Meus amigos']]} ativo="/app/proximo" rotulo="Perto" />
    <p style={{ color: 'var(--suave)' }}>Descubra encontros e pessoas por perto.</p>
    <Proximo />
  </>);
}
