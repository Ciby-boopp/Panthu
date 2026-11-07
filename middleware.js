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
    if (!user) return ir('/entrar');
    const { data: p } = await sb.from('perfis').select('papel, ativo, bloqueado').eq('id', user.id).single();
    if (!p || !p.ativo || p.bloqueado) return ir('/entrar?erro=acesso');
    if (path.startsWith('/admin') && p.papel !== 'admin') return ir('/app');
    if (path.startsWith('/host') && !['host', 'admin'].includes(p.papel)) return ir('/app');
  }
  return res;
}
export const config = { matcher: ['/app/:path*', '/host/:path*', '/admin/:path*'] };
