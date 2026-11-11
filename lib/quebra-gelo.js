// Sugestões de quebra-gelo. Edite à vontade: cada grupo aparece como uma opção para a pessoa escolher.
export const QUEBRA_GELO = [
  { grupo: 'Para começar', frases: [
    'Oi! Primeira vez em um encontro do Panthu?',
    'Oi, tudo bem? O que te fez querer participar?',
    'Olá! Já conhecia alguém por aqui?',
  ] },
  { grupo: 'Sobre o encontro', frases: [
    'Você vai ao próximo encontro? Vamos sentar juntos?',
    'O que você espera do encontro?',
    'Alguma sugestão do que pedir por lá?',
  ] },
  { grupo: 'Para conhecer', frases: [
    'Qual foi a última coisa que te fez rir de verdade?',
    'Se pudesse jantar com qualquer pessoa, quem seria?',
    'Qual hobby você gostaria de ter tempo para praticar?',
    'Qual é o seu lugar favorito para passar uma tarde livre?',
  ] },
  { grupo: 'Mais leves', frases: [
    'Time doce ou salgado?',
    'Qual música não sai da sua cabeça ultimamente?',
    'Qual filme ou série você recomendaria agora?',
  ] },
];
export const TODAS = QUEBRA_GELO.flatMap(g => g.frases);
