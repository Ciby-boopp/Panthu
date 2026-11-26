import BotaoVoltar from '@/components/BotaoVoltar';
import ManualAdmin from '@/components/admin/ManualAdmin';
import { MANUAL_USUARIO } from '@/lib/manualUsuario';
export const metadata = { title: 'Manual de uso' };
export default function Page() {
  return (<>
    <p><BotaoVoltar href="/app" className="btn o mini">← Voltar</BotaoVoltar></p>
    <h1 style={{ fontSize: 30 }}>Manual de uso</h1>
    <p style={{ color: 'var(--suave)' }}>Como usar o Panthu, passo a passo. Toque em uma pergunta ou use a busca.</p>
    <ManualAdmin manual={MANUAL_USUARIO} />
  </>);
}
