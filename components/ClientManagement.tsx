'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { getClients, createClient, updateClient, deleteClient } from '@/lib/client/db-client'
import { UserPlus, Mail, User, Edit, Trash2, X, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function ClientManagement() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [requiresTimesheet, setRequiresTimesheet] = useState(false)
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [newCcEmail, setNewCcEmail] = useState('')
  const [clientToDelete, setClientToDelete] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const clientsList = await getClients()
      setClients(clientsList)
    } catch (error) {
      console.error('Error loading clients:', error)
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientEmail.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, preencha nome e email",
        variant: "destructive",
      })
      return
    }

    try {
      await createClient({
        name: newClientName.trim(),
        email: newClientEmail.trim(),
        requiresTimesheet: requiresTimesheet,
        ccEmails: ccEmails,
      })
      toast({
        title: "Cliente Criado",
        description: `${newClientName} foi adicionado`,
        variant: "default",
      })
      setNewClientName('')
      setNewClientEmail('')
      setRequiresTimesheet(false)
      setDialogOpen(false)
      loadClients()
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar cliente",
        variant: "destructive",
      })
    }
  }

  const handleEditClient = (client: any) => {
    setEditingClient(client)
    setNewClientName(client.name)
    setNewClientEmail(client.email)
    setRequiresTimesheet(client.requires_timesheet === 1 || client.requires_timesheet === true)
    setDialogOpen(true)
  }

  const handleUpdateClient = async () => {
    if (!newClientName.trim() || !newClientEmail.trim() || !editingClient) {
      toast({
        title: "Validation Error",
        description: "Please fill in both name and email",
        variant: "destructive",
      })
      return
    }

    try {
      await updateClient(editingClient.id, {
        name: newClientName.trim(),
        email: newClientEmail.trim(),
        requiresTimesheet: requiresTimesheet,
        ccEmails: ccEmails,
      })
      toast({
        title: "Cliente Atualizado",
        description: `${newClientName} foi atualizado`,
        variant: "default",
      })
      setNewClientName('')
      setNewClientEmail('')
      setRequiresTimesheet(false)
      setCcEmails([])
      setNewCcEmail('')
      setEditingClient(null)
      setDialogOpen(false)
      loadClients()
    } catch (error) {
      console.error('Error updating client:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      await deleteClient(clientToDelete.id)
      toast({
        title: "Client Deleted",
        description: `${clientToDelete.name} has been deleted`,
        variant: "success",
      })
      setClientToDelete(null)
      setDeleteDialogOpen(false)
      loadClients()
    } catch (error) {
      console.error('Error deleting client:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      })
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingClient(null)
    setNewClientName('')
    setNewClientEmail('')
    setRequiresTimesheet(false)
    setCcEmails([])
    setNewCcEmail('')
  }

  const addCcEmail = () => {
    const email = newCcEmail.trim()
    if (email && !ccEmails.includes(email)) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(email)) {
        setCcEmails([...ccEmails, email])
        setNewCcEmail('')
      } else {
        toast({
          title: "Email Inválido",
          description: "Por favor, insira um email válido",
          variant: "destructive",
        })
      }
    }
  }

  const removeCcEmail = (emailToRemove: string) => {
    setCcEmails(ccEmails.filter(email => email !== emailToRemove))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading clients...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Clients
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No clients yet. Add your first client to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-md border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {client.name}
                        {(client.requires_timesheet === 1 || client.requires_timesheet === true) && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded">
                            Requer Timesheet
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </p>
                      {client.cc_emails && (() => {
                        try {
                          const ccEmails = JSON.parse(client.cc_emails)
                          if (Array.isArray(ccEmails) && ccEmails.length > 0) {
                            return (
                              <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                CC: {ccEmails.join(', ')}
                              </p>
                            )
                          }
                        } catch {
                          // Ignore parse errors
                        }
                        return null
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClient(client)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(client)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Atualize as informações do cliente' : 'Adicione um novo cliente ao sistema'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <input
                id="clientName"
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client Name"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email do Cliente *</Label>
              <input
                id="clientEmail"
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
                className="w-full p-2 border rounded-md bg-background"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="requiresTimesheet"
                type="checkbox"
                checked={requiresTimesheet}
                onChange={(e) => setRequiresTimesheet(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="requiresTimesheet" className="text-sm font-normal cursor-pointer">
                Requer timesheet (ex: INDRA)
              </Label>
            </div>
            
            {/* CC Emails Section */}
            <div className="space-y-2">
              <Label htmlFor="ccEmails">Emails CC (Cópia)</Label>
              <div className="flex gap-2 items-stretch">
                <input
                  id="ccEmails"
                  type="email"
                  value={newCcEmail}
                  onChange={(e) => setNewCcEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCcEmail()
                    }
                  }}
                  placeholder="cc@exemplo.com"
                  className="flex-1 p-2 border rounded-md bg-background"
                />
                <Button
                  type="button"
                  onClick={addCcEmail}
                  variant="outline"
                  className="shrink-0 px-3 h-auto"
                  style={{ height: 'auto', minHeight: '2.5rem' }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {ccEmails.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeCcEmail(email)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={editingClient ? handleUpdateClient : handleCreateClient}>
              {editingClient ? 'Atualizar Cliente' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {clientToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

