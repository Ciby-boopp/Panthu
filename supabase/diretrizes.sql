-- =====================================================================
-- Panthu — Diretrizes da comunidade (editáveis pelo administrador)
-- Rode UMA vez no Supabase (SQL Editor). Pode rodar de novo: não apaga o que você já editou.
-- =====================================================================
create table if not exists public.diretrizes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null check (char_length(titulo) between 2 and 80),
  conteudo text not null default '' check (char_length(conteudo) <= 6000),
  ordem int not null default 100,
  visivel boolean not null default true,
  padrao boolean not null default false,   -- seção pré-definida (não pode ser excluída)
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.perfis(id) on delete set null
);
alter table public.diretrizes enable row level security;

drop policy if exists dir_ver on public.diretrizes;
create policy dir_ver on public.diretrizes for select to anon, authenticated using (visivel or public.eh_admin());
drop policy if exists dir_admin on public.diretrizes;
create policy dir_admin on public.diretrizes for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
grant select on public.diretrizes to anon, authenticated;
grant insert, update, delete on public.diretrizes to authenticated;

create or replace function public.diretrizes_marcar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  if tg_op = 'UPDATE' then new.padrao := old.padrao; new.slug := old.slug; end if;
  return new;
end $$;
drop trigger if exists diretrizes_marcar on public.diretrizes;
create trigger diretrizes_marcar before insert or update on public.diretrizes for each row execute function public.diretrizes_marcar();

-- Impede excluir as seções padrão.
create or replace function public.diretrizes_protege()
returns trigger language plpgsql as $$
begin
  if old.padrao then raise exception 'As seções padrão não podem ser excluídas (você pode escondê-las).'; end if;
  return old;
end $$;
drop trigger if exists diretrizes_protege on public.diretrizes;
create trigger diretrizes_protege before delete on public.diretrizes for each row execute function public.diretrizes_protege();

-- Seções pré-definidas, com um texto inicial. O administrador edita tudo depois.
insert into public.diretrizes (slug, titulo, conteudo, ordem, padrao) values
('proposta', 'Nossa proposta', E'O Panthu é um espaço de amizade, socialização e respeito.\nNão é um aplicativo de paquera, namoro ou relacionamento amoroso.', 1, true),
('convivencia', 'Respeito e convivência', E'- Trate todas as pessoas com educação, sem preconceito de qualquer tipo.\n- Respeite o espaço e o tempo de cada um: um “não” é um “não”.\n- Não faça convites românticos, elogios insistentes ou comentários sobre o corpo de ninguém.', 2, true),
('seguranca', 'Segurança e privacidade', E'- Não peça dados pessoais, dinheiro ou fotos.\n- Não compartilhe informações de outras pessoas.\n- Não divulgue telefone, endereço ou rotina de ninguém sem permissão.', 3, true),
('encontros', 'Encontros presenciais', E'- Seja pontual e avise se não puder ir.\n- Siga as orientações do host e do estabelecimento.\n- Em caso de qualquer desconforto, procure o host do encontro.', 4, true),
('conteudo', 'Conteúdo e linguagem', E'- Não envie conteúdo ofensivo, violento, sexual ou propaganda.\n- Use apenas fotos suas e adequadas no perfil.', 5, true),
('chat_jogos', 'Bate-papo, grupos e jogos', E'- Nos grupos, mantenha o assunto e o respeito.\n- Nos jogos, jogue limpo: sem trapaça, provocação ou ofensas.\n- Nomes de grupos devem ser respeitosos.', 6, true),
('hosts', 'Conduta dos hosts', E'- Receba todas as pessoas com igualdade e cuidado.\n- Registre ocorrências e acione a equipe quando necessário.\n- Não use a função de host para benefício pessoal.', 7, true),
('parceiros', 'Parceiros e estabelecimentos', E'- Os parceiros oferecem benefícios aos usuários do Panthu.\n- Respeite as regras de cada estabelecimento.', 8, true),
('denuncias', 'Denúncias e medidas', E'Use o botão de denúncia ou fale com o host ou com o suporte.\nA equipe pode advertir, suspender ou remover contas que desrespeitem estas diretrizes.', 9, true)
on conflict (slug) do nothing;
