'use client'

import ClientManagement from '@/components/ClientManagement'

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes e suas configurações
        </p>
      </div>

      <ClientManagement />
    </div>
  )
}

