'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { Client } from '@/types'

interface EditingClientEmail {
  clientId: string
  email: string
}

interface ClientEmailDialogProps {
  editingClientEmail: EditingClientEmail | null
  clients: Client[]
  onClose: () => void
  onUpdate: (clientId: string, email: string) => Promise<void>
  onEmailChange: (email: string) => void
}

const ClientEmailDialog = ({
  editingClientEmail,
  clients,
  onClose,
  onUpdate,
  onEmailChange,
}: ClientEmailDialogProps) => {
  if (!editingClientEmail) return null

  const client = clients.find(c => c.id === editingClientEmail.clientId)
  if (!client) return null

  const handleSubmit = async () => {
    await onUpdate(editingClientEmail.clientId, editingClientEmail.email.trim() || '')
  }

  return (
    <Dialog open={!!editingClientEmail} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Email do Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Cliente:</p>
            <p className="text-sm text-muted-foreground">{client.name}</p>
          </div>
          <div>
            <Label htmlFor="clientEmail" className="text-sm font-medium mb-1 block">
              Email:
            </Label>
            <input
              id="clientEmail"
              type="email"
              value={editingClientEmail.email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
              placeholder="email@exemplo.com"
              aria-describedby="clientEmailHint"
            />
            <span id="clientEmailHint" className="sr-only">
              Digite o email do cliente
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              type="button"
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ClientEmailDialog }
export type { ClientEmailDialogProps, EditingClientEmail }

