'use client'

import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import type { Client } from '@/types'

interface ClientSelectFieldProps {
  value: string
  isNewClient: boolean
  newClientName: string
  clients: Client[]
  selectedClient: Client | null
  disabled?: boolean
  onClientChange: (clientId: string) => void
  onNewClientToggle: (isNew: boolean) => void
  onNewClientNameChange: (name: string) => void
  onBlur?: () => void
}

const ClientSelectField = ({
  value,
  isNewClient,
  newClientName,
  clients,
  selectedClient,
  disabled = false,
  onClientChange,
  onNewClientToggle,
  onNewClientNameChange,
  onBlur,
}: ClientSelectFieldProps) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__new__') {
      onNewClientToggle(true)
      onNewClientNameChange('')
      onClientChange('')
    } else {
      onNewClientToggle(false)
      onClientChange(e.target.value)
    }
  }

  const handleNewClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    onNewClientNameChange(name)
    // Use a temporary ID based on name for validation
    onClientChange(`__new__${name}`)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="clientId">Cliente *</Label>
      <select
        id="clientId"
        name="clientId"
        value={isNewClient ? '__new__' : value}
        onBlur={onBlur}
        onChange={handleSelectChange}
        className="w-full p-2 border rounded-md bg-background"
        disabled={disabled}
        aria-label="Selecionar cliente"
        aria-required="true"
      >
        {clients.length === 0 ? (
          <option value="">Nenhum cliente disponível</option>
        ) : (
          <>
            <option value="">Selecione um cliente...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {(client.requires_timesheet === 1 || client.requires_timesheet === true) 
                  ? ' (requer timesheet)' 
                  : ''}
              </option>
            ))}
            <option value="__new__">➕ Criar Novo Cliente</option>
          </>
        )}
      </select>

      {isNewClient && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 space-y-2"
        >
          <Label htmlFor="newClientName">Nome do Novo Cliente *</Label>
          <input
            id="newClientName"
            type="text"
            value={newClientName}
            onChange={handleNewClientNameChange}
            placeholder="Digite o nome do cliente"
            className="w-full p-2 border rounded-md bg-background"
            disabled={disabled}
            aria-label="Nome do novo cliente"
            aria-required="true"
          />
          <p className="text-xs text-muted-foreground">
            O cliente será criado automaticamente sem email. Você poderá adicionar o email depois.
          </p>
        </motion.div>
      )}

      {selectedClient && !isNewClient && (
        <p className="text-sm text-muted-foreground">
          Email:{' '}
          {selectedClient.email || (
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              Não configurado
            </span>
          )}
        </p>
      )}
    </div>
  )
}

export default ClientSelectField



