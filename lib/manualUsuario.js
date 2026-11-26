// Manual de uso para PARTICIPANTES. Mesmo formato do manual do administrador.
export const MANUAL_USUARIO = [
  { id: 'comecar', titulo: 'Começando', icone: '🚀', perguntas: [
    { q: 'O que é o Panthu?', passos: ['É uma comunidade de amizades: você participa de encontros, conversa, joga e conhece pessoas da sua cidade, com respeito.', 'Não é aplicativo de paquera ou namoro.'], ir: ['/diretrizes', 'Ler as Diretrizes'] },
    { q: 'Como instalar o Panthu no celular?', passos: ['Abra o link do Panthu no navegador do celular. Aparece o aviso “Instale o Panthu no seu celular”.', 'Android: toque em “Instalar agora” (ou nos três pontinhos ⋮ → “Instalar app”).', 'iPhone: no Safari, toque em Compartilhar → “Adicionar à Tela de Início” → “Adicionar”.', 'As atualizações chegam sozinhas, com o mesmo link.'] },
    { q: 'Esqueci minha senha. Como recupero?', passos: ['Na tela de entrada, toque em “Esqueci a senha” e digite o seu e-mail.', 'Abra o e-mail que chegar (olhe também o spam) e toque no link para criar uma senha nova.', 'Se o e-mail não chegar, fale com o suporte.'] },
    { q: 'Como altero a minha senha?', passos: ['Toque em ☰ → Configurações.', 'Na seção “Alterar senha” digite a senha atual, a nova (mínimo de 8 caracteres e 1 caractere especial) e repita a nova.', 'Toque em “Alterar senha”.'], ir: ['/app/configuracoes', 'Abrir Configurações'] },
    { q: 'Quais são as telas do app?', passos: ['Barra de baixo: Início, Jogos, Bate-papo, Eventos e Meu Perfil.', 'Menu ☰: Configurações, Perto de você, Encontrar pessoas, Meus amigos, Favoritos, Meus pontos, Convidar amigos, Fale com o suporte, Manual de uso e Diretrizes da comunidade.'] },
    { q: 'Como volto para a tela anterior?', passos: ['Use o botão “← Voltar” no topo das telas: ele volta para onde você estava. Nos jogos, toque na casinha “⌂ Voltar”.'] },
    { q: 'O Panthu ainda não existe na minha cidade. O que faço?', passos: ['Na tela Início, toque em “Ainda não tem o Panthu na sua cidade?”.', 'Informe sua cidade (opcional) e toque em “Enviar ao suporte”. A mensagem “Quero ter o Panthu na minha cidade” vai direto para a equipe.'], ir: ['/app', 'Ir para o Início'] },
  ]},
  { id: 'eventos', titulo: 'Eventos e encontros', icone: '📅', perguntas: [
    { q: 'Como encontro eventos?', passos: ['Toque em “Eventos” na barra de baixo para ver os encontros publicados.', 'Em ☰ → “Perto de você” veja eventos próximos e use os filtros por categoria.'], ir: ['/app/eventos', 'Ver eventos'] },
    { q: 'Como confirmo presença em um evento?', passos: ['Abra o evento e toque no botão de confirmar presença.', 'Se não puder ir, cancele para liberar a vaga. Avise o host quando possível.'], ir: ['/app/eventos', 'Ver eventos'] },
    { q: 'Como avalio um encontro?', passos: ['Depois do evento, abra-o e responda “Como foi o encontro?”.', 'Dê a sua nota e, se quiser, escreva comentários e sugestões. Você pode editar a avaliação depois.'] },
    { q: 'O que são as mesas e o quebra-gelo?', passos: ['No encontro, o host pode sortear mesas e propor dinâmicas para a turma se conhecer.', 'Siga a orientação do host e participe com respeito.'] },
  ]},
  { id: 'pessoas', titulo: 'Perfil, amigos e pessoas', icone: '👤', perguntas: [
    { q: 'Como edito o meu perfil?', passos: ['Toque em “Meu Perfil”.', 'Altere foto, nome, cidade, biografia e interesses. O telefone não aparece para os outros.', 'Salve.'], ir: ['/app/perfil', 'Abrir Meu Perfil'] },
    { q: 'Como adiciono mais fotos ao perfil?', passos: ['Em Meu Perfil, use a galeria de fotos para adicionar mais imagens (até 2 MB cada).', 'Quem abrir o seu perfil poderá ver a galeria.'] },
    { q: 'Como encontro uma pessoa pelo nome?', passos: ['Toque em ☰ → “Encontrar pessoas”.', 'Escolha a cidade, digite o nome e toque em Buscar.', 'Abra o perfil ou toque em “Salvar amigo”.'], ir: ['/app/buscar', 'Encontrar pessoas'] },
    { q: 'Como vejo os meus amigos e favoritos?', passos: ['Toque em ☰ → “Meus amigos” ou “Favoritos”.', 'Para favoritar um local ou pessoa, use o botão de favorito na tela dela.'], ir: ['/app/amigos', 'Meus amigos'] },
    { q: 'Como convido amigos para o Panthu?', passos: ['Toque em ☰ → “Convidar amigos” e compartilhe a mensagem pronta pelo WhatsApp ou outro aplicativo.'], ir: ['/app/convidar', 'Convidar amigos'] },
    { q: 'Como baixo meus dados ou excluo a minha conta?', passos: ['Em Meu Perfil, na seção “Meus dados e privacidade”, toque em “Baixar meus dados” ou em “Excluir minha conta”.', 'A exclusão apaga seus dados pessoais, favoritos, pontos e convites e não pode ser desfeita.'], ir: ['/app/perfil', 'Abrir Meu Perfil'] },
    { q: 'Como ajusto a leitura do app (acessibilidade)?', passos: ['Em Meu Perfil, na seção “Acessibilidade”, ajuste o que precisar. O Panthu funciona com leitores de tela e navegação pelo teclado.'] },
  ]},
  { id: 'chat', titulo: 'Bate-papo e grupos', icone: '💬', perguntas: [
    { q: 'Como converso com alguém?', passos: ['Abra o perfil da pessoa e toque em “Conversar”. Ela recebe o pedido e pode “Aceitar” ou “Recusar”.', 'Depois de aceito, a conversa aparece em “Bate-papo”.'], ir: ['/app/chat', 'Abrir Bate-papo'] },
    { q: 'Como entro em um grupo de conversa?', passos: ['Em “Bate-papo”, veja a seção “Grupos para conversar”: “Café e boas conversas”, “Novos na cidade” e “Para quem gosta de viajar”, além dos grupos criados pela comunidade.', 'Toque no grupo e depois em “Entrar no grupo”. Para sair, use “Sair do grupo”.'], ir: ['/app/chat', 'Abrir Bate-papo'] },
    { q: 'Como crio o meu próprio grupo?', passos: ['Em “Bate-papo”, toque em “➕ Criar grupo”.', 'Escolha o nome (3 a 40 letras) e, se quiser, uma descrição. Toque em “Criar grupo”.', 'Você pode ter até 5 grupos. Quem criou pode excluir o grupo pelo botão “Excluir”.'], dica: 'Use nomes respeitosos. Grupos que desrespeitem as diretrizes podem ser removidos.', ir: ['/app/chat', 'Abrir Bate-papo'] },
    { q: 'Como recebo avisos de mensagens?', passos: ['Em Configurações ative as notificações. No iPhone, instale o app na tela inicial antes.', 'O número no ícone do Bate-papo mostra só as mensagens novas, ainda não lidas.'], ir: ['/app/configuracoes', 'Abrir Configurações'] },
    { q: 'Como bloqueio ou denuncio alguém?', passos: ['Abra o perfil da pessoa e use “Bloquear pedidos” ou “Denunciar”.', 'Escreva o motivo e toque em “Enviar denúncia”. A equipe analisa e toma as providências.'] },
  ]},
  { id: 'jogos', titulo: 'Jogos', icone: '🎮', perguntas: [
    { q: 'Quais jogos existem?', passos: ['Truco, Xadrez, Jogo da Memória, Paciência, Caça-palavras e “Quem é o Impostor?”.', 'Dá para jogar sozinho (contra o computador) ou com amigos.'], ir: ['/app/jogos', 'Abrir Jogos'] },
    { q: 'Como jogo com um amigo?', passos: ['Em “Jogos”, escolha o jogo e toque em “Jogar”.', 'Convide um amigo: ele recebe o aviso e entra na sala.'] },
    { q: 'Como ligo, desligo e ajusto a música?', passos: ['Dentro do jogo, toque em “🎵 Música ligada” para desligar ou ligar.', 'Use a barrinha 🔈—🔊 para o volume.'] },
    { q: 'Como funciona o Truco?', passos: ['Cada jogador recebe 3 cartas. Quem pedir TRUCO sobe o valor da mão para 3; depois podem pedir 6, 9 e 12.', 'O adversário responde Aceitar, Aumentar ou “Correr”.', 'O botão “Correr” aparece na sua vez: antes da primeira carta da partida você troca de cartas sem perder pontos; depois disso, perde a mão.', 'O patinho 🦆 faz “quá” e o botão 😂 manda uma risada para a tela do adversário.'] },
    { q: 'Como grito TRUCO com a minha voz?', passos: ['Toque em ☰ → Configurações → “Meu grito de TRUCO” e grave até 3 segundos.', 'No jogo, a sua voz grita só o primeiro TRUCO. Se você não gravar, vale a voz padrão do Panthu. Em 6, 9 e 12 vale sempre a voz padrão.', 'Ainda em Configurações, em “Voz do grito” escolha Automática, Feminina ou Masculina e toque em “Testar a voz”. A voz padrão sai do seu aparelho, então pode soar diferente de um celular para outro.'], ir: ['/app/configuracoes', 'Abrir Configurações'] },
    { q: 'Como funciona o “Quem é o Impostor?”', passos: ['Cada jogador recebe uma palavra secreta, menos o impostor, que não sabe qual é.', 'Todos dão dicas e conversam; depois votam em quem acham que é o impostor.', 'Você pode criar uma sala, entrar numa sala aberta ou convidar amigos.'], ir: ['/app/impostor', 'Abrir Impostor'] },
    { q: 'Como jogo de novo sem voltar ao início?', passos: ['Ao fim da partida, toque em “🔄 Jogar novamente”: outra partida começa na hora.'] },
  ]},
  { id: 'pontos', titulo: 'Pontos, brindes e suporte', icone: '⭐', perguntas: [
    { q: 'Como ganho pontos?', passos: ['Participando de eventos, jogos e outras ações. Veja as regras em ☰ → “Meus pontos”.'], ir: ['/app/pontos', 'Ver meus pontos'] },
    { q: 'Como resgato um brinde?', passos: ['Ao chegar na meta de pontos você recebe um cupom em “Meus pontos”.', 'Mostre o código para o host ou parceiro, que confere e entrega o brinde.'], ir: ['/app/pontos', 'Ver meus pontos'] },
    { q: 'Como falo com o suporte?', passos: ['Toque em ☰ → “Fale com o suporte”, escreva o assunto e a mensagem e envie.'], ir: ['/app/suporte', 'Fale com o suporte'] },
    { q: 'Onde ficam as regras da comunidade?', passos: ['Na página “Diretrizes da comunidade”. Leia antes de participar dos encontros e do bate-papo.'], ir: ['/diretrizes', 'Ler as Diretrizes'] },
  ]},
];
