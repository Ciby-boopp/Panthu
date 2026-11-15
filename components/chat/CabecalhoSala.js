import Link from 'next/link';
import Icone from '../Icone';

export const SUBTITULO = {
  geral: 'Aqui conversa todo mundo do Panthu.',
  evento: 'Sala liberada só para quem confirmou presença no encontro.',
  privada: 'Conversa entre duas pessoas que vão ao mesmo evento.'
};

export default function CabecalhoSala({ titulo, tipo }) {
  const chave = tipo === 'geral' || tipo === 'evento' ? tipo : 'privada';
  return (
    <header className="sala-cab">
      <Link href="/app/chat" className="sala-voltar" aria-label="Voltar para as conversas"><Icone nome="voltar" /></Link>
      <span className="sala-cab-ico" aria-hidden="true"><Icone nome={chave === 'privada' ? 'perfil' : 'usuarios'} /></span>
      <div>
        <h1>{titulo}</h1>
        <small>{SUBTITULO[chave]}</small>
      </div>
    </header>
  );
}
