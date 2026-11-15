// Edge Function "enviar-push": chamada por Database Webhooks (mensagens, conversa_pedidos, eventos, jogos_convites, pontos_cupons).
// Segredos necessários (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, WEBHOOK_SECRET.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente dentro da função.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

const resumo = (t: string) => {
  const limpo = String(t || '').replace(/\s+/g, ' ').trim();
  return limpo.length > 90 ? limpo.slice(0, 89) + '…' : limpo;
};
const primeiroNome = (n: string) => String(n || 'Alguém').trim().split(/\s+/)[0];
const ok = () => new Response('ok');

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('negado', { status: 401 });
  let corpo: any;
  try { corpo = await req.json(); } catch { return new Response('json inválido', { status: 400 }); }
  if (corpo?.type !== 'INSERT' || !corpo.record) return ok();
  const r = corpo.record;

  let titulo = '', texto = '', url = '/app/chat', tag = 'panthu', ehComunidade = false;
  let elegiveis: Set<string> | null = null; // null = todos (comunidade)
  let jogoPref = false;

  if (corpo.table === 'mensagens') {
    const [{ data: autor }, { data: sala }] = await Promise.all([
      sb.from('perfis').select('nome').eq('id', r.autor_id).maybeSingle(),
      sb.from('chat_salas').select('tipo, evento_id').eq('id', r.sala_id).maybeSingle(),
    ]);
    if (!sala) return ok();
    const nome = primeiroNome(autor?.nome);
    texto = resumo(r.texto);
    tag = `sala-${r.sala_id}`;
    if (sala.tipo === 'geral') {
      titulo = `${nome} · Comunidade`; ehComunidade = true;
    } else if (sala.tipo === 'evento') {
      const { data: ev } = await sb.from('eventos').select('nome').eq('id', sala.evento_id).maybeSingle();
      titulo = `${nome} · ${ev?.nome || 'Evento'}`; url = `/app/chat/${r.sala_id}`;
      const { data: c } = await sb.from('confirmacoes').select('usuario_id').eq('evento_id', sala.evento_id).in('status', ['confirmado', 'presente']);
      elegiveis = new Set((c || []).map((x: any) => x.usuario_id));
    } else {
      titulo = nome; url = `/app/chat/${r.sala_id}`;
      const { data: m } = await sb.from('chat_membros').select('usuario_id').eq('sala_id', r.sala_id);
      elegiveis = new Set((m || []).map((x: any) => x.usuario_id));
    }
    if (elegiveis) elegiveis.delete(r.autor_id);
  } else if (corpo.table === 'conversa_pedidos') {
    if (r.status !== 'pendente') return ok();
    const { data: de } = await sb.from('perfis').select('nome').eq('id', r.de).maybeSingle();
    titulo = 'Pedido para conversar'; texto = `${primeiroNome(de?.nome)} quer conversar com você`;
    url = '/app/chat'; tag = `pedido-${r.de}`;
    elegiveis = new Set([r.para]);
  } else if (corpo.table === 'eventos') {
    // Aviso personalizado: evento na cidade da pessoa ou ligado a um interesse dela.
    const { data: est } = r.estabelecimento_id ? await sb.from('estabelecimentos').select('nome, endereco').eq('id', r.estabelecimento_id).maybeSingle() : { data: null };
    const { data: pessoas } = await sb.from('perfis').select('id, cidade, interesses').eq('ativo', true).eq('bloqueado', false);
    const prefsEv = new Map(((await sb.from('push_prefs').select('usuario_id, eventos_regiao, eventos_interesse')).data || []).map((p: any) => [p.usuario_id, p]));
    const base = `${r.nome || ''} ${r.categoria || ''} ${r.descricao || ''}`.toLowerCase();
    const endereco = String(est?.endereco || '').toLowerCase();
    elegiveis = new Set();
    let motivoRegiao = new Set<string>();
    for (const p of pessoas || []) {
      const pf = prefsEv.get(p.id);
      const cidade = String(p.cidade || '').trim().toLowerCase();
      const naRegiao = cidade.length >= 3 && endereco.includes(cidade) && pf?.eventos_regiao !== false;
      const nosInteresses = (p.interesses || []).some((i: string) => base.includes(String(i).toLowerCase())) && pf?.eventos_interesse !== false;
      if (naRegiao || nosInteresses) { elegiveis.add(p.id); if (naRegiao) motivoRegiao.add(p.id); }
    }
    if (!elegiveis.size) return ok();
    titulo = 'Novo encontro para você'; texto = resumo(`${r.nome || 'Encontro'}${est?.nome ? ' · ' + est.nome : ''}`);
    url = `/app/evento/${r.id}`; tag = `evento-${r.id}`;
  } else if (corpo.table === 'jogos_convites') {
    if (r.status !== 'pendente') return ok();
    const { data: de } = await sb.from('perfis').select('nome').eq('id', r.de).maybeSingle();
    titulo = 'Convite para jogar'; texto = `${primeiroNome(de?.nome)} te chamou para jogar ${r.jogo === 'memoria' ? 'Memória' : 'Truco'}`;
    url = `/app/jogos?convite=${r.id}`; tag = `jogo-${r.id}`;
    elegiveis = new Set([r.para]);
    jogoPref = true;
  } else if (corpo.table === 'pontos_cupons') {
    titulo = 'Você ganhou um brinde! 🎁'; texto = 'Seu cupom de brinde já está disponível.';
    url = '/app/pontos'; tag = `cupom-${r.id}`;
    elegiveis = new Set([r.usuario_id]);
  } else return ok();

  const [{ data: subs }, { data: prefs }, { data: fora }] = await Promise.all([
    sb.from('push_inscricoes').select('id, usuario_id, endpoint, p256dh, auth').limit(5000),
    sb.from('push_prefs').select('usuario_id, previa, comunidade, jogos'),
    sb.from('perfis').select('id').or('ativo.eq.false,bloqueado.eq.true'),
  ]);
  const pref = new Map((prefs || []).map((p: any) => [p.usuario_id, p]));
  const excluidos = new Set((fora || []).map((p: any) => p.id));
  if (corpo.table === 'mensagens') excluidos.add(r.autor_id);

  const alvos = (subs || []).filter((s: any) => {
    if (excluidos.has(s.usuario_id)) return false;
    if (elegiveis && !elegiveis.has(s.usuario_id)) return false;
    if (ehComunidade && pref.get(s.usuario_id)?.comunidade === false) return false;
    if (jogoPref && pref.get(s.usuario_id)?.jogos === false) return false;
    return true;
  });

  const mortas: string[] = [];
  await Promise.allSettled(alvos.map(async (s: any) => {
    const semPrevia = corpo.table === 'mensagens' && pref.get(s.usuario_id)?.previa === false;
    const carga = JSON.stringify({ title: titulo, body: semPrevia ? 'Nova mensagem' : texto, url, tag });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 3600 });
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) mortas.push(s.id);
    }
  }));
  if (mortas.length) await sb.from('push_inscricoes').delete().in('id', mortas);
  return ok();
});
