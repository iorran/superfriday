'use client'

import OldFilesImport from '@/components/OldFilesImport'

export default function ImportOldFilesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Importar Arquivos Antigos</h1>
        <p className="text-muted-foreground">
          Importe invoices antigas que já foram enviadas manualmente. Estas invoices aparecerão nas finanças mas não serão enviadas por email.
        </p>
      </div>

      <OldFilesImport />
    </div>
  )
}

