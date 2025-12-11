'use client'

import EmailAccountManagement from '@/components/EmailAccountManagement'

export default function EmailAccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">SMTP</h1>
        <p className="text-muted-foreground">
          Configure as contas SMTP usadas para enviar invoices. Se nenhuma conta estiver configurada, o sistema usará as variáveis de ambiente (SMTP_HOST, SMTP_USER, etc.).
        </p>
      </div>

      <EmailAccountManagement />
    </div>
  )
}

