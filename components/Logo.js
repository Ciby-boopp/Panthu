/* eslint-disable @next/next/no-img-element */
// Duas versões do logo (verde para o dia, creme para a noite); o CSS mostra a certa conforme o tema escolhido.
function Imagem({ nome, className, alt = '' }) {
  return (<>
    <img className={`${className} so-claro`} src={`/${nome}.png`} alt={alt} />
    <img className={`${className} so-escuro`} src={`/${nome}-claro.png`} alt="" aria-hidden="true" />
  </>);
}
export default function Logo({ completo = false }) {
  if (completo) return <Imagem nome="logo-completo" className="logo-completo" alt="Panthu — Liberdade para pertencer" />;
  return (
    <span className="marca-logo" role="img" aria-label="Panthu">
      <Imagem nome="logo-simbolo" className="simb" /><Imagem nome="logo-nome" className="nome" />
    </span>
  );
}
