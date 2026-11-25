import BotaoVoltar from '@/components/BotaoVoltar';
export const metadata = { title: 'Privacidade e LGPD' };
export default function Privacidade() {
  return (
    <main className="estreito">
      <p><BotaoVoltar href="/entrar">← Voltar</BotaoVoltar></p>
      <h1 style={{ fontSize: 32 }}>Privacidade e proteção de dados</h1>
      <p style={{ color: 'var(--suave)' }}>Explicamos de forma simples como o Panthu trata os seus dados, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>
      <div className="card"><h3>Quais dados usamos</h3>
        <p>Nome, e-mail, telefone, foto e biografia (se você preencher), cidade, interesses, hobbies e o que procura, presenças em encontros, mensagens do chat, jogos e pontos. A localização só é usada se você ativar “Perto de você”.</p></div>
      <div className="card"><h3>Para que usamos</h3>
        <ul><li>Organizar encontros e confirmar presenças.</li><li>Sugerir encontros e pessoas da sua região e dos seus interesses.</li>
          <li>Enviar avisos que você escolheu receber.</li><li>Manter a segurança da comunidade.</li></ul>
        <p>Não vendemos os seus dados. O seu telefone e e-mail não aparecem para outras pessoas.</p></div>
      <div className="card"><h3>Seus direitos</h3>
        <ul><li>Ver e corrigir os seus dados em <b>Perfil</b>.</li><li>Baixar uma cópia dos seus dados em <b>Perfil → Meus dados e privacidade</b>.</li>
          <li>Excluir a sua conta a qualquer momento no mesmo lugar. Os dados pessoais são apagados ou anonimizados; mensagens antigas do chat ficam sem o seu nome.</li>
          <li>Retirar o consentimento, o que equivale a excluir a conta.</li></ul></div>
      <div className="card"><h3>Proteção</h3>
        <p>Os dados ficam em um banco com acesso restrito por regras de segurança: cada pessoa só enxerga o que lhe pertence ou o que é público na comunidade. Os acessos da equipe ficam registrados.</p>
        <p>Dúvidas ou pedidos sobre os seus dados: fale com a administração do Panthu pelo e-mail de contato informado no seu encontro.</p></div>
    </main>
  );
}
