import './globals.css';
import { Quicksand, Figtree } from 'next/font/google';
const titulo = Quicksand({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-titulo' });
const texto = Figtree({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-texto' });
export const metadata = { title: 'Panthu', description: 'Liberdade para pertencer', manifest: '/manifest.webmanifest' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#17261D' };
export default function Layout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${titulo.variable} ${texto.variable}`}>{children}</body>
    </html>
  );
}
