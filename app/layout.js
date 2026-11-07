import './globals.css';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';
const titulo = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '800'], variable: '--f-titulo' });
const texto = Figtree({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-texto' });
export const metadata = { title: 'Panthu', description: 'Encontros presenciais de amizade', manifest: '/manifest.webmanifest' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#5B2EE0' };
export default function Layout({ children }) {
  return <html lang="pt-BR"><body className={`${titulo.variable} ${texto.variable}`}>{children}</body></html>;
}
