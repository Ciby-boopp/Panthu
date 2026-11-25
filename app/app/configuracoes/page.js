import Configuracoes from '@/components/Configuracoes';
import BotaoVoltar from '@/components/BotaoVoltar';
export const metadata = { title: 'Configurações' };
export default function Page() {
  return (<>
    <h1>Configurações</h1>
    <Configuracoes />
    <p style={{ marginTop: 14 }}><BotaoVoltar className="btn o" href="/app/perfil">← Voltar</BotaoVoltar></p>
  </>);
}
