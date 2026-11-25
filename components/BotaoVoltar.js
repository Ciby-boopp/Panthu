'use client';
import { useRouter } from 'next/navigation';
import { lerNav } from './RastroNav';

// "Voltar" que lembra de onde a pessoa veio: volta para a tela anterior (com a rolagem e os filtros que estavam).
// Se ela entrou direto nesta tela (link, notificação), vai para a tela padrão indicada em href.
export default function BotaoVoltar({ href, children = '← Voltar', className }) {
  const router = useRouter();
  return (
    <a href={href} className={className} onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      if (lerNav() > 0) router.back(); else router.push(href);
    }}>{children}</a>
  );
}
