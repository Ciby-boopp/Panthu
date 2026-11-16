import './globals.css';
import { Quicksand, Figtree } from 'next/font/google';
const titulo = Quicksand({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-titulo' });
const texto = Figtree({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-texto' });
export const metadata = { title: 'Panthu', description: 'Liberdade para pertencer', manifest: '/manifest.webmanifest' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#17261D' };
export default function Layout({ children }) {
  return (
    <html lang="pt-BR">
      <head><script dangerouslySetInnerHTML={{ __html: "try{var a=JSON.parse(localStorage.getItem('panthu_acess')||'null');if(a){var h=document.documentElement;h.dataset.texto=a.texto||'normal';h.dataset.contraste=a.contraste||'normal';h.dataset.movimento=a.movimento||'normal'}}catch(e){}" }} /></head>
      <body className={`${titulo.variable} ${texto.variable}`}><a href="#conteudo" className="pular">Pular para o conteúdo</a>{children}</body>
    </html>
  );
}
