export const metadata = {
  title: 'Termos de Serviço | Invoice Manager',
  description: 'Termos de serviço do Invoice Manager',
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
        <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="space-y-6 prose prose-sm max-w-none">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Aceitação dos Termos</h2>
          <p>
            Ao usar o Invoice Manager, você concorda com estes termos de serviço. Se você não concorda,
            não use o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Uso do Serviço</h2>
          <p className="mb-2">
            O Invoice Manager é fornecido para gerenciamento de invoices e documentos financeiros.
            Você é responsável por:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Manter a segurança de sua conta e senha</li>
            <li>Fornecer informações precisas e atualizadas</li>
            <li>Usar o serviço apenas para fins legítimos</li>
            <li>Não compartilhar sua conta com terceiros</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Limitação de Responsabilidade</h2>
          <p className="mb-2">
            O serviço é fornecido &ldquo;como está&rdquo;. Não garantimos:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Precisão absoluta na extração de dados de PDFs</li>
            <li>Disponibilidade ininterrupta do serviço</li>
            <li>Ausência de erros ou bugs</li>
          </ul>
          <p className="mt-2">
            Não nos responsabilizamos por decisões tomadas com base nos dados processados ou por perdas
            resultantes do uso do serviço.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo do Invoice Manager, incluindo código, design, textos e funcionalidades,
            é propriedade do serviço e protegido por leis de propriedade intelectual. Você não pode
            copiar, modificar ou distribuir o serviço sem autorização.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Dados do Usuário</h2>
          <p>
            Você mantém todos os direitos sobre seus dados. Ao usar o serviço, você nos concede
            permissão para armazenar e processar seus dados conforme necessário para fornecer o serviço.
            Você pode solicitar a exclusão de seus dados a qualquer momento.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Integrações de Terceiros</h2>
          <p>
            O serviço pode integrar com serviços de terceiros (como Google Drive). O uso desses serviços
            está sujeito aos termos e políticas de privacidade dos respectivos provedores. Não somos
            responsáveis pelas práticas de privacidade ou segurança de serviços de terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Modificações do Serviço</h2>
          <p>
            Reservamos o direito de modificar, suspender ou descontinuar o serviço a qualquer momento,
            com ou sem aviso prévio. Não seremos responsáveis por você ou terceiros por tais modificações.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Encerramento</h2>
          <p>
            Podemos encerrar ou suspender sua conta e acesso ao serviço imediatamente, sem aviso prévio,
            por qualquer motivo, incluindo violação destes termos.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Lei Aplicável</h2>
          <p>
            Estes termos são regidos pelas leis aplicáveis. Qualquer disputa será resolvida nos
            tribunais competentes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Alterações nos Termos</h2>
          <p>
            Podemos atualizar estes termos ocasionalmente. Notificaremos você sobre mudanças significativas.
            O uso continuado do serviço após as alterações constitui aceitação dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">11. Contato</h2>
          <p>
            Se você tiver dúvidas sobre estes termos de serviço, entre em contato conosco através
            do email de suporte configurado no aplicativo.
          </p>
        </section>
      </div>
    </div>
  )
}

