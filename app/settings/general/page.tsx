'use client'

import SettingsPanel from '@/components/SettingsPanel'

const GeneralSettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Contador</h1>
        <p className="text-muted-foreground">
          Configure o email do contador para envio de invoices
        </p>
      </div>

      <SettingsPanel />
    </div>
  )
}

export default GeneralSettingsPage
