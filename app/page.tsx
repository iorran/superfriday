'use client'

import FileList from '@/components/FileList'
import BuildInfo from '@/components/BuildInfo'

const Home = () => {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Invoices</h1>
        <p className="text-muted-foreground">
          Gerencie suas invoices e acompanhe o status de envio
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <FileList />
      </div>
      <BuildInfo />
    </div>
  )
}

export default Home
