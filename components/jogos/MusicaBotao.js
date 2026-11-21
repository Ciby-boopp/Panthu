'use client';
import { useEffect, useState } from 'react';
import { assinarMusica, definirMusica, iniciarMusica, intensidade, musicaLigada, musicaTocando, pararMusica } from '@/lib/musicaJogos';

// Toca a música do jogo enquanto a tela do jogo estiver aberta, com botão para ligar/desligar o som.
export default function MusicaBotao({ jogo, tensao = false }) {
  const [ligada, setLigada] = useState(true);
  const [tocando, setTocando] = useState(false);
  useEffect(() => {
    setLigada(musicaLigada());
    const sai = assinarMusica(setTocando);
    iniciarMusica(jogo);
    setTocando(musicaTocando());
    return () => { sai(); pararMusica(true); };
  }, [jogo]);
  useEffect(() => { intensidade(tensao ? 1 : 0); }, [tensao]);
  const alternar = () => { const n = !ligada; setLigada(n); definirMusica(n); };
  return (
    <div className="musica-linha">
      <button type="button" className="btn o mini" onClick={alternar} aria-pressed={ligada}
        aria-label={ligada ? 'Desligar a música do jogo' : 'Ligar a música do jogo'}>
        {ligada ? '🎵 Música ligada' : '🔇 Música desligada'}{ligada && !tocando ? ' (toque na tela)' : ''}
      </button>
    </div>
  );
}
