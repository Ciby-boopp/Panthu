# Atualização: pedidos de conversa, contador (1) e notificações no celular

## O que mudou
- **Perfil de quem escreveu na comunidade abre**, com botão **Pedir para conversar**. A outra pessoa aceita, recusa ou bloqueia em **Chat** (aparece um cartão "Pedidos para conversar" no topo) ou no perfil de quem pediu.
- Quem divide um evento com você continua conversando direto, sem pedido.
- **Contador (1)** no ícone do Chat e no título da aba, guardado no banco: aparece em qualquer aparelho, mesmo se a mensagem chegou com o app fechado.
- **Notificação push** no celular com nome e resumo da mensagem (Perfil → Notificações no celular).
- Pedidos recusados só podem ser repetidos depois de 7 dias; quem foi bloqueado não é avisado; limite de 20 pedidos por dia.

## Passo a passo
1. Substitua o projeto pelo zip novo e envie para o GitHub (a Vercel gera o preview).
2. Supabase → **SQL Editor** → rode, nesta ordem (pode repetir sem problema):
   `supabase/atualizacao-2.sql` → `supabase/jogos.sql` → `supabase/conversas-e-push.sql`
3. Supabase → **Edge Functions** → **Deploy a new function** → nome `enviar-push` → cole o conteúdo de `supabase/functions/enviar-push/index.ts` → Deploy.
4. Ainda em Edge Functions → **Secrets**: crie `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `WEBHOOK_SECRET` com os valores do arquivo **CHAVES-PRIVADAS-NAO-SUBIR-NO-GITHUB.txt** (troque o endereço em `VAPID_SUBJECT` pelo do seu site).
5. Supabase → **Database → Webhooks → Create a new hook** (faça DOIS):
   - **Hook 1**: nome `push_mensagens`, tabela `mensagens`, evento **Insert**, tipo **Supabase Edge Functions**, função `enviar-push`, método POST. Em **HTTP Headers**, adicione `x-webhook-secret` com o valor do `WEBHOOK_SECRET`.
   - **Hook 2**: nome `push_pedidos`, tabela `conversa_pedidos`, evento **Insert**, mesma função e mesmo cabeçalho.
6. Vercel → **Settings → Environment Variables**: adicione `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (valor no arquivo de chaves) e faça um novo deploy.

## Teste
- Android: abra no Chrome → Perfil → **Ativar notificações**.
- iPhone: Safari → Compartilhar → **Adicionar à Tela de Início** → abra pelo ícone → Perfil → Ativar.
- Com duas contas: mande uma mensagem com o app fechado na que recebe. Deve chegar a notificação e, ao abrir, o (1) no Chat.
- Toque no nome de alguém na comunidade → **Pedir para conversar** → aceite na outra conta → a conversa aparece em **Chat → Privadas**.

## Se algo não funcionar
- Sem notificação: confira se os dois webhooks existem, se os 4 segredos foram criados e se o app foi publicado de novo na Vercel depois de adicionar a variável.
- Erro 401 no log da função: o cabeçalho `x-webhook-secret` do webhook está diferente do segredo `WEBHOOK_SECRET`.
- Erro de JWT no webhook: em Edge Functions → `enviar-push` → Settings, desligue **Verify JWT** (o segredo do cabeçalho continua protegendo).
