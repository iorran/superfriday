'use client'

import EmailTemplateManagement from '@/components/EmailTemplateManagement'

const TemplatesPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Templates de Email</h1>
        <p className="text-muted-foreground">
          Crie e gerencie templates reutilizáveis para envio de emails
        </p>
      </div>

      <EmailTemplateManagement />
    </div>
  )
}

export default TemplatesPage
