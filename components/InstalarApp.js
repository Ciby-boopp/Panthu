'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const CHAVE = 'panthu_instalar_ate';
const guardar = (v) => { try { localStorage.setItem(CHAVE, String(v)); } catch {} };
const ler = () => { try { return Number(localStorage.getItem(CHAVE) || 0); } catch { return 0; } };

// Quando o Panthu é aberto pelo navegador do celular, convida a instalar e mostra o caminho (Android ou iPhone).
export default function InstalarApp() {
  const path = usePathname();
  const [plat, setPlat] = useState(null);   // 'android' | 'ios' | 'ios-outro'
  const [visivel, setVisivel] = useState(false);
  const [passos, setPasso] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const evt = useRef(null);
  const [temEvento, setTemEvento] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const android = /android/i.test(ua);
    if (!ios && !android) return; // computador: não mostra
    const instalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (instalado) return;
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa\/|fbav|fban|instagram|line\//i.test(ua);
    setPlat(android ? 'android' : safari ? 'ios' : 'ios-outro');
    const antes = (e) => { e.preventDefault(); evt.current = e; setTemEvento(true); };
    const feito = () => { guardar(Date.now() + 3650 * 864e5); setVisivel(false); };
    window.addEventListener('beforeinstallprompt', antes);
    window.addEventListener('appinstalled', feito);
    let t;
    if (Date.now() > ler()) t = setTimeout(() => setVisivel(true), 2500);
    return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', antes); window.removeEventListener('appinstalled', feito); };
  }, []);

  if (!plat || !visivel || path?.startsWith('/admin') || path?.startsWith('/host')) return null;

  const agoraNao = () => { guardar(Date.now() + 3 * 864e5); setVisivel(false); };
  async function instalar() {
    if (evt.current) {
      evt.current.prompt();
      const r = await evt.current.userChoice.catch(() => null);
      evt.current = null; setTemEvento(false);
      if (r?.outcome === 'accepted') { setVisivel(false); return; }
    }
    setPasso(true);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(window.location.origin); setCopiado(true); } catch { setCopiado(false); }
  }

  return (
    <div className="instalar" role="dialog" aria-label="Instalar o Panthu no celular">
      <div className="instalar-topo">
        <span className="instalar-ico" aria-hidden="true">📲</span>
        <div><b>Instale o Panthu no seu celular</b><small>Abre mais rápido, em tela cheia, como um aplicativo.</small></div>
      </div>
      {passos && (
        <ol className="instalar-passos">
          {plat === 'android' && <>
            <li>Toque nos <b>três pontinhos ⋮</b> no canto de cima do navegador.</li>
            <li>Toque em <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.</li>
            <li>Confirme em <b>“Instalar”</b>. O ícone do Panthu aparece na sua tela.</li>
          </>}
          {plat === 'ios' && <>
            <li>Toque no botão <b>Compartilhar</b> <span className="instalar-share" aria-hidden="true">⬆️</span> (o quadrado com uma seta, na barra de baixo do Safari).</li>
            <li>Role a lista e toque em <b>“Adicionar à Tela de Início”</b>.</li>
            <li>Toque em <b>“Adicionar”</b>, no canto de cima. O ícone do Panthu aparece na sua tela.</li>
          </>}
          {plat === 'ios-outro' && <>
            <li>No iPhone, a instalação só funciona pelo <b>Safari</b>. Copie o link e abra no Safari.</li>
            <li>No Safari, toque em <b>Compartilhar</b> <span className="instalar-share" aria-hidden="true">⬆️</span> e depois em <b>“Adicionar à Tela de Início”</b>.</li>
            <li>Toque em <b>“Adicionar”</b>.</li>
          </>}
        </ol>
      )}
      <div className="instalar-acoes">
        {plat === 'ios-outro' && passos
          ? <button type="button" className="btn p" onClick={copiar}>{copiado ? '✔ Link copiado' : '📋 Copiar link'}</button>
          : !passos && <button type="button" className="btn p" onClick={plat === 'android' && temEvento ? instalar : () => setPasso(true)}>
              {plat === 'android' && temEvento ? 'Instalar agora' : 'Mostrar como instalar'}</button>}
        {passos && plat === 'android' && temEvento && <button type="button" className="btn p" onClick={instalar}>Instalar agora</button>}
        <button type="button" className="btn o" onClick={agoraNao}>Agora não</button>
      </div>
    </div>
  );
}
