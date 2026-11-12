/* eslint-disable @next/next/no-img-element */
// Logo oficial do Panthu (imagem circular enviada, sem alterações no desenho).
export default function Logo({ completo = false }) {
  if (completo) return <img className="logo-completo" src="/logo-panthu.png" alt="Panthu — Liberdade para pertencer" width="240" height="240" />;
  return <span className="marca-logo"><img src="/logo-panthu.png" alt="Panthu" width="44" height="44" /></span>;
}
