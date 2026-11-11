export default function Loading() {
  return (<div className="grade-eventos" aria-busy="true" aria-label="Carregando">{[0, 1, 2].map(i => <div key={i} className="esqueleto" />)}</div>);
}
