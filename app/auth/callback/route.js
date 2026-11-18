import { NextResponse } from 'next/server';
import { criarServidor } from '@/lib/supabase/server';

// Destino dos links enviados por e-mail (confirmação de cadastro e recuperação de senha).
// Aceita os dois formatos do Supabase: ?code=... (PKCE) e ?token_hash=...&type=... (funciona em qualquer navegador).
function destinoSeguro(next, padrao) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : padrao;
}

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const recuperacao = type === 'recovery';
  const next = destinoSeguro(url.searchParams.get('next'), recuperacao ? '/redefinir' : '/app');
  const falha = (cod) => NextResponse.redirect(new URL(`/entrar?erro=${cod}`, url.origin));

  const sb = await criarServidor();
  let error = null;
  if (tokenHash && type) ({ error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type }));
  else if (code) ({ error } = await sb.auth.exchangeCodeForSession(code));
  else return falha('link');

  if (error) {
    // Link aberto em outro aparelho/navegador, vencido ou já usado.
    return falha(next.startsWith('/redefinir') ? 'link_senha' : 'link');
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
