import './globals.css';
import { Quicksand, Figtree } from 'next/font/google';
const titulo = Quicksand({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-titulo' });
const texto = Figtree({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-texto' });
export const metadata = { title: 'Panthu', description: 'Liberdade para pertencer', manifest: '/manifest.webmanifest' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#164F46' };
// Aplica o tema salvo (ou o do aparelho) antes da primeira pintura, evitando o "piscar" claro/escuro.
const temaInicial = `try{var t=localStorage.getItem('panthu-tema')||(matchMedia('(prefers-color-scheme:dark)').matches?'escuro':'claro');document.documentElement.dataset.tema=t;if(t==='escuro'){var m=document.querySelector('meta[name=theme-color]');m&&m.setAttribute('content','#0C1B18')}}catch(e){}`;
export default function Layout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: temaInicial }} /></head>
      <body className={`${titulo.variable} ${texto.variable}`}>{children}</body>
    </html>
  );
}
