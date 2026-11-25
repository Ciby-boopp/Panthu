import ManualAdmin from '@/components/admin/ManualAdmin';
export const metadata = { title: 'Manual de uso' };
export default function Page() {
  return (<>
    <h1 style={{ fontSize: 30 }}>Manual de uso</h1>
    <p style={{ color: 'var(--suave)' }}>Tudo sobre o Panthu e o painel ADM. Toque em uma pergunta para ver o passo a passo, ou use a busca.</p>
    <ManualAdmin />
  </>);
}
