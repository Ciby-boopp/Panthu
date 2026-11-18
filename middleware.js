import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      }
    }
  });
  const { data: { user } } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const protegida = ['/app', '/host', '/admin'].some(p => path === p || path.startsWith(p + '/'));
  const ir = (destino) => NextResponse.redirect(new URL(destino, req.url));
  if (protegida) {
    if (!user) {
      // Tinha login guardado e ele não vale mais (venceu/revogado) → avisa; quem nunca entrou só vai para o login.
      const tinha = req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
      return ir(tinha ? '/entrar?sessao=expirada' : '/entrar');
    }
    // Uma única consulta ao perfil (antes eram duas). Se a coluna onboarding_em ainda não existe, refaz sem ela.
    let { data: p, error: e1 } = await sb.from('perfis').select('papel, ativo, bloqueado, onboarding_em').eq('id', user.id).single();
    let semOnboarding = false;
    if (e1 && !p) { semOnboarding = true; ({ data: p } = await sb.from('perfis').select('papel, ativo, bloqueado').eq('id', user.id).single()); }
    if (!p || !p.ativo || p.bloqueado) return ir('/entrar?erro=acesso');
    if (path.startsWith('/admin') && p.papel !== 'admin') return ir('/app');
    if (path.startsWith('/host') && !['host', 'admin'].includes(p.papel)) return ir('/app');
    // Cadastro inteligente: quem ainda não respondeu as boas-vindas vai para lá.
    if (path.startsWith('/app') && path !== '/app/boas-vindas' && !semOnboarding && !p.onboarding_em) return ir('/app/boas-vindas');
  }
  return res;
}
export const config = { matcher: ['/app/:path*', '/host/:path*', '/admin/:path*'] };
