'use client';
// Grupo de opções que se marcam e desmarcam (acessível: cada chip é um botão com aria-pressed).
export default function ChipsSelect({ rotulo, opcoes, valor, onChange, max = 20 }) {
  const alternar = (o) => {
    if (valor.includes(o)) onChange(valor.filter((x) => x !== o));
    else if (valor.length < max) onChange([...valor, o]);
  };
  return (
    <fieldset className="chips" style={{ border: 0, padding: 0, margin: '14px 0' }}>
      <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{rotulo}</legend>
      <div className="chips-lista">
        {opcoes.map((o) => <button type="button" key={o} className={`chip ${valor.includes(o) ? 'on' : ''}`} aria-pressed={valor.includes(o)} onClick={() => alternar(o)}>{o}</button>)}
      </div>
    </fieldset>
  );
}
