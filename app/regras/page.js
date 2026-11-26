import BotaoVoltar from '@/components/BotaoVoltar';
export const metadata = { title: 'Regras de convivência' };
export default function Regras() {
  return (
    <main className="estreito">
      <p><BotaoVoltar href="/entrar">← Voltar</BotaoVoltar></p>
      <h1 style={{ fontSize: 32 }}>Regras de convivência</h1>
      <p><a href="/diretrizes">Ver as Diretrizes da comunidade completas →</a></p>
      <p style={{ color: 'var(--suave)' }}>O Panthu existe para criar amizades e vida social com respeito. Estas regras valem para encontros, chat e jogos.</p>
      <div className="card"><h3>A nossa proposta</h3>
        <p>O Panthu é um espaço de <b>amizade, socialização e respeito</b>. Não é um aplicativo de paquera, namoro ou relacionamento amoroso, e não aceitamos esse tipo de abordagem.</p></div>
      <div className="card"><h3>O que esperamos de você</h3>
        <ul><li>Trate todas as pessoas com educação, sem preconceito de qualquer tipo.</li>
          <li>Respeite o espaço e o tempo de cada um: um “não” é um “não”.</li>
          <li>Não faça convites românticos, elogios insistentes ou comentários sobre o corpo de ninguém.</li>
          <li>Não peça dados pessoais, dinheiro ou fotos, e não compartilhe informações de outras pessoas.</li>
          <li>Não envie conteúdo ofensivo, violento, sexual ou propaganda.</li>
          <li>Seja pontual e avise se não puder ir a um encontro.</li></ul></div>
      <div className="card"><h3>Se algo sair do combinado</h3>
        <p>Use o botão de denúncia ou fale com o host do encontro. A equipe pode advertir, suspender ou remover contas que desrespeitem estas regras.</p></div>
    </main>
  );
}
