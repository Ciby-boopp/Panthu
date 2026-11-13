const D = {
  eventos: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  perfil: <><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></>,
  host: <><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></>,
  adm: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></>,
  chat: <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>,
  busca: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  gelo: <><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2"/></>,
  sair: <><path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4"/><path d="M16 8l4 4-4 4M20 12H9"/></>,
  sol: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  lua: <path d="M20 14.5A8 8 0 019.5 4 8.5 8.5 0 1020 14.5z"/>,
  olho: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  olhoRiscado: <><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A17 17 0 002 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></>,
  usuarios: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 15c2 .5 3.2 2 3.5 5"/></>,
  local: <><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>,
  jogos: <><rect x="4" y="3" width="12" height="16" rx="2.5"/><path d="M9 21h8a3 3 0 003-3V8"/><path d="M10 8.5l2 2.5-2 2.5-2-2.5z"/></>,
  alerta: <><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.5"/></>,
};
export default function Icone({ nome, className = '' }) {
  return <svg className={`ico ${className}`} viewBox="0 0 24 24" aria-hidden="true">{D[nome]}</svg>;
}
