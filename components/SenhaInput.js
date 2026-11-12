'use client';
import { useState } from 'react';
import Icone from './Icone';
import { SENHA_REGRA } from '@/lib/senha';
// Campo de senha com botão de olho. Oculta por padrão; o valor continua em name="senha" para os formulários existentes.
// Com forte=true (cadastro e troca de senha) exige 8+ caracteres e 1 caractere especial.
export default function SenhaInput({ id, name = 'senha', autoComplete, minLength = 8, required = true, forte = false }) {
  const [ver, setVer] = useState(false);
  return (<>
    <div className="senha">
      <input id={id} name={name} type={ver ? 'text' : 'password'} required={required} minLength={minLength} autoComplete={autoComplete}
        {...(forte ? { pattern: '(?=.*[^A-Za-z0-9\\s]).{8,}', title: SENHA_REGRA } : {})} aria-describedby={forte ? `${id}-regra` : undefined} />
      <button type="button" className="olho" aria-pressed={ver} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVer(v => !v)}>
        <Icone nome="olho" className="aberto" /><Icone nome="olhoRiscado" className="fechado" />
      </button>
    </div>
    {forte && <small id={`${id}-regra`} style={{ color: 'var(--suave)' }}>{SENHA_REGRA}</small>}
  </>);
}
