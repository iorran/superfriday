export const metadata = {
  title: 'Política de Privacidade | Invoice Manager',
  description: 'Política de privacidade do Invoice Manager',
}

const PrivacyPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="space-y-6 prose prose-sm max-w-none">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Informações que Coletamos</h2>
          <p className="mb-2">
            O Invoice Manager coleta e armazena as seguintes informações:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Dados de Conta:</strong> Email, nome e informações de autenticação</li>
            <li><strong>Dados de Invoices:</strong> Arquivos PDF, valores, datas, informações de clientes</li>
            <li><strong>Dados de Clientes:</strong> Nomes, emails e preferências de comunicação</li>
            <li><strong>Configurações:</strong> Templates de email, configurações SMTP, preferências do usuário</li>
            <li><strong>Tokens OAuth:</strong> Tokens criptografados para integração com Google Drive (opcional)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Como Usamos Suas Informações</h2>
          <p className="mb-2">Utilizamos suas informações para:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Gerenciar e organizar suas invoices</li>
            <li>Enviar emails para clientes e contadores</li>
            <li>Processar e extrair dados de PDFs de invoices</li>
            <li>Fornecer análises financeiras e relatórios</li>
            <li>Melhorar nossos serviços e funcionalidades</li>
            <li>Integrar com Google Drive para importação de arquivos (quando autorizado)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Integração com Google Drive</h2>
          <p className="mb-2">
            Quando você autoriza a integração com Google Drive, solicitamos acesso somente leitura aos seus arquivos.
            Isso nos permite:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Listar pastas e arquivos PDF no seu Google Drive</li>
            <li>Baixar arquivos PDF selecionados para processamento</li>
            <li>Não modificamos, deletamos ou compartilhamos seus arquivos</li>
          </ul>
          <p className="mt-2">
            Os tokens de acesso são armazenados de forma criptografada e você pode revogar o acesso a qualquer momento
            através das configurações do Google ou dentro do aplicativo.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Armazenamento de Dados</h2>
          <p className="mb-2">
            Seus dados são armazenados de forma segura:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Banco de Dados:</strong> MongoDB Atlas (dados criptografados em trânsito e em repouso)</li>
            <li><strong>Arquivos:</strong> Vercel Blob Storage (armazenamento seguro e redundante)</li>
            <li><strong>Tokens OAuth:</strong> Criptografados usando AES-256-GCM antes do armazenamento</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Compartilhamento de Dados</h2>
          <p>
            Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Quando necessário para fornecer o serviço (ex: processamento de PDFs via Veryfi API)</li>
            <li>Quando exigido por lei ou ordem judicial</li>
            <li>Com seu consentimento explícito</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Seus Direitos</h2>
          <p className="mb-2">Você tem o direito de:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir informações incorretas</li>
            <li>Solicitar a exclusão de seus dados</li>
            <li>Exportar seus dados</li>
            <li>Revogar consentimentos (ex: integração com Google Drive)</li>
          </ul>
          <p className="mt-2">
            Para exercer esses direitos, entre em contato conosco ou use a funcionalidade de exclusão de dados
            disponível nas configurações.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Segurança</h2>
          <p>
            Implementamos medidas de segurança adequadas para proteger suas informações, incluindo criptografia,
            autenticação segura e controle de acesso. No entanto, nenhum método de transmissão ou armazenamento
            é 100% seguro.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Retenção de Dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços.
            Você pode solicitar a exclusão de seus dados a qualquer momento através das configurações do aplicativo.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta política de privacidade ocasionalmente. Notificaremos você sobre mudanças
            significativas através do aplicativo ou por email.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Contato</h2>
          <p>
            Se você tiver dúvidas sobre esta política de privacidade ou sobre como tratamos seus dados,
            entre em contato conosco através do email de suporte configurado no aplicativo.
          </p>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPage
