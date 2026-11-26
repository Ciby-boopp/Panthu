// Manual de uso para HOSTS (quem coordena encontros). Mesmo formato do manual do administrador.
export const MANUAL_HOST = [
  { id: 'inicio', titulo: 'Primeiros passos', icone: '🚀', perguntas: [
    { q: 'O que é a Área do Host?', passos: ['É a sua área de trabalho nos encontros: aqui você vê os eventos sob a sua responsabilidade, confere presença, organiza mesas e dinâmicas e confere cupons de brinde.', 'Quem define os seus eventos e as suas permissões é o administrador do Panthu.'] },
    { q: 'Como acesso a Área do Host?', passos: ['No computador, clique em “Host” no menu de cima.', 'No celular, toque em ☰ (menu) e depois em “Área do Host”.'], ir: ['/host', 'Abrir Área do Host'] },
    { q: 'Não vejo nenhum evento. O que fazer?', passos: ['Aparece “Nenhum evento vinculado a você” quando o administrador ainda não ligou eventos ao seu perfil.', 'Fale com o administrador e peça para vincular os seus eventos.'] },
    { q: 'O que significam as etiquetas Participantes, Mesas, Dinâmicas e Ocorrências?', passos: ['São as suas permissões, definidas pelo administrador. “sim” = você pode usar; “não” = não tem acesso.', 'Participantes: ver a lista e marcar presença. Mesas: sortear e organizar mesas. Dinâmicas: usar rodadas e quebra-gelo. Ocorrências: registrar o que acontecer no encontro.', 'Se precisar de mais uma permissão, peça ao administrador.'] },
    { q: 'O que é a “região de responsabilidade”?', passos: ['É a cidade ou área que você coordena. Aparece no topo da Área do Host (“Responsável pela região”).'] },
    { q: 'Como volto para a tela anterior?', passos: ['Use o botão “← Voltar” no topo das telas: ele volta para onde você estava antes.'] },
  ]},
  { id: 'encontro', titulo: 'Durante o encontro', icone: '📋', perguntas: [
    { q: 'Como abrir a gestão de um encontro?', passos: ['Na Área do Host, ache o evento e toque em “Presença e mesas”.', 'Você verá as abas disponíveis para as suas permissões: Presença, Mesas, Rodadas e outras.'] },
    { q: 'Como marcar quem chegou (presença)?', passos: ['Abra o evento em “Presença e mesas” e vá na aba “Presença”.', 'Veja os contadores “presentes” e “confirmados”.', 'Toque na pessoa para marcá-la como presente. Toque de novo para desfazer.'], dica: 'A presença marcada conta para os pontos e o histórico da pessoa.' },
    { q: 'Como sortear as mesas?', passos: ['Abra o evento e vá na aba “Mesas”.', 'Informe “Criar quantas mesas?” e, se quiser, “Lugares por mesa”.', 'Toque em “Sortear mesas”. Se alguém ficar de fora, aparece em “Sem mesa”.', 'Se já houver presença marcada, o sorteio usa só quem está presente; senão usa todos os confirmados.'] },
    { q: 'Como usar as dinâmicas e o quebra-gelo?', passos: ['Abra o evento e vá na aba de dinâmicas (Rodadas).', 'Crie uma nova rodada escrevendo a “Orientação da nova rodada”.', 'Use o “Quebra-gelo” e “Mais ideias” para sugestões de perguntas e brincadeiras para a mesa.'] },
    { q: 'Como registrar uma ocorrência?', passos: ['Se tiver a permissão “Ocorrências”, abra o evento e use a aba de ocorrências.', 'Descreva com calma o que aconteceu. O registro fica guardado e o administrador pode consultar.', 'Em caso de risco, avise o administrador na hora.'] },
    { q: 'Alguém está se comportando mal. O que eu faço?', passos: ['Converse com a pessoa com respeito e lembre das diretrizes da comunidade.', 'Se continuar, registre a ocorrência e avise o administrador, que pode advertir, suspender ou remover a conta.'], ir: ['/diretrizes', 'Ler as Diretrizes da comunidade'] },
  ]},
  { id: 'cupons', titulo: 'Cupons e brindes', icone: '🎁', perguntas: [
    { q: 'Como conferir um cupom de brinde?', passos: ['Na Área do Host, toque em “🎁 Conferir cupom de brinde”.', 'Peça o código para a pessoa e digite em “Código do cupom”. Toque em “Conferir”.', 'Se estiver válido, toque em “Entregar brinde (dar baixa)” depois de entregar o brinde.'], ir: ['/host/cupons', 'Conferir cupom'] },
    { q: 'Por que a pessoa tem um cupom?', passos: ['Quando ela chega à meta de pontos definida pelo administrador, recebe um cupom automaticamente.'] },
    { q: 'O cupom aparece como já usado. E agora?', passos: ['Cada cupom vale uma vez. Se já foi dado baixa, não entregue de novo. Avise o administrador se achar que houve erro.'] },
  ]},
  { id: 'regras', titulo: 'Conduta e ajuda', icone: '🤝', perguntas: [
    { q: 'Quais são as diretrizes da comunidade?', passos: ['Elas ficam na página pública “Diretrizes da comunidade”, que o administrador mantém atualizada. Há uma seção especial sobre a conduta dos hosts.'], ir: ['/diretrizes', 'Ler as Diretrizes'] },
    { q: 'Como falo com o administrador ou o suporte?', passos: ['Pelo menu ☰ → “Fale com o suporte”, que abre um chamado direto para a equipe.'], ir: ['/app/suporte', 'Fale com o suporte'] },
    { q: 'Posso usar o app como participante também?', passos: ['Sim. O host tem todas as telas do app (Início, Jogos, Bate-papo, Eventos e Meu Perfil) e a Área do Host a mais.'], ir: ['/app/manual', 'Ver o manual do participante'] },
  ]},
];
