'use client';
import { useState } from 'react';
import Icone from './Icone';
// Campo de senha com botão de olho. Oculta por padrão; o valor continua em name="senha" para os formulários existentes.
export default function SenhaInput({ id, name = 'senha', autoComplete, minLength = 8, required = true }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="senha">
      <input id={id} name={name} type={ver ? 'text' : 'password'} required={required} minLength={minLength} autoComplete={autoComplete} />
      <button type="button" className="olho" aria-pressed={ver} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVer(v => !v)}>
        <Icone nome="olho" className="aberto" /><Icone nome="olhoRiscado" className="fechado" />
      </button>
    </div>
  );
}
