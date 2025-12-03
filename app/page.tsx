'use client'

import { useState } from 'react'
import FileList from '@/components/FileList'
import FloatingUploadButton from '@/components/FloatingUploadButton'
import BuildInfo from '@/components/BuildInfo'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Invoices</h1>
        <p className="text-muted-foreground">
          Gerencie suas invoices e acompanhe o status de envio
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <FileList refreshTrigger={refreshTrigger} />
      </div>
      <FloatingUploadButton onUploadSuccess={handleUploadSuccess} />
      <BuildInfo />
    </div>
  )
}
