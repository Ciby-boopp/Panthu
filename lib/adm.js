export const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
export const dataHora = (d) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }) : '—');
export const NOMES_JOGO = { xadrez: 'Xadrez', truco: 'Truco', memoria: 'Memória', paciencia: 'Paciência', cacapalavras: 'Caça-palavras', blackjack: 'Blackjack' };

// As 11 áreas do painel. Cada item abre uma página; as sub-abas ficam dentro da página (?aba=).
export const AREAS = [
  ['Visão geral', [['/admin', 'Painel', 'adm'], ['/admin/conexoes', 'Conexões', 'usuarios']]],
  ['Usuários', [['/admin/usuarios', 'Usuários', 'perfil'], ['/admin/cadastros', 'Cadastros e acessos', 'check']]],
  ['Hosts', [['/admin/hosts', 'Hosts e gestão regional', 'host'], ['/admin/pedidos-host', 'Pedidos para ser host', 'check']]],
  ['Cidades e regiões', [['/admin/regioes', 'Regiões e expansão', 'local']]],
  ['Encontros e atividades', [['/admin/eventos', 'Eventos', 'eventos'], ['/admin/atividades', 'Mesas, jogos e participantes', 'jogos'], ['/admin/impostor', 'Quem é o Impostor?', 'jogos']]],
  ['Parcerias e cupons', [['/admin/estabelecimentos', 'Estabelecimentos', 'local'], ['/admin/parcerias', 'Cupons e benefícios', 'check'], ['/admin/pontos', 'Pontos e brindes', 'jogos']]],
  ['Denúncias e suporte', [['/admin/denuncias', 'Denúncias', 'alerta'], ['/admin/suporte', 'Atendimento e segurança', 'chat'], ['/admin/avaliacoes', 'Avaliações', 'check']]],
  ['Financeiro', [['/admin/financeiro', 'Receitas, despesas e auditoria', 'enviar']]],
  ['Planejamento e agenda', [['/admin/planejamento', 'Metas, tarefas e eventos', 'eventos']]],
  ['Monitoramento técnico', [['/admin/monitoramento', 'Erros, estabilidade e alertas', 'alerta']]],
  ['Auditoria e segurança', [['/admin/auditoria', 'Histórico', 'busca'], ['/admin/seguranca', 'Permissões e LGPD', 'adm']]],
  ['Backup e configurações', [['/admin/configuracoes', 'Proteção e administração', 'adm']]],
  ['Ajuda e comunidade', [['/admin/diretrizes', 'Diretrizes da comunidade', 'check'], ['/admin/manual', 'Manual de uso', 'busca']]],
];
