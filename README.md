# Panthu

1. Instale Node.js 20+ (nodejs.org).
2. Na pasta do projeto: `npm install` e depois `npm run dev`.
3. Abra http://localhost:3000
4. Variáveis (arquivo `.env.local`, veja `.env.example`):
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY (chave publishable)
   Nunca coloque chave secret/service_role aqui.
5. Publicação: Vercel ou Cloudflare Pages, repetindo as duas variáveis.
