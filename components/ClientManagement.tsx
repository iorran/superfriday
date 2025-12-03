'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/lib/hooks/use-clients'
import { UserPlus, Mail, User, Edit, Trash2, X, Plus } from 'lucide-react'
import type { Client } from '@/types'
import { clientSchema, type ClientFormData } from '@/lib/validations'
import { z } from 'zod'
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
  const { data: clients = [], isLoading: loading } = useClients()
  const createClientMutation = useCreateClient()
  const updateClientMutation = useUpdateClient()
  const deleteClientMutation = useDeleteClient()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [newCcEmail, setNewCcEmail] = useState('')
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const { toast } = useToast()

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      requiresTimesheet: false,
      ccEmails: [],
    },
    onSubmit: async ({ value }: { value: ClientFormData }) => {
      // Validate with Zod schema
      const result = clientSchema.safeParse(value)
      if (!result.success) {
        toast({
          title: "Erro de Validação",
          description: result.error.errors[0]?.message || "Por favor, verifique os campos",
          variant: "destructive",
        })
        return
      }
      if (editingClient) {
        await handleUpdateClient(value)
      } else {
        await handleCreateClient(value)
      }
    },
  })

  const handleCreateClient = async (value: ClientFormData) => {
    try {
      await createClientMutation.mutateAsync({
        name: value.name,
        email: value.email,
        requiresTimesheet: value.requiresTimesheet,
        ccEmails: value.ccEmails,
      })
      toast({
        title: "Cliente Criado",
        description: `${value.name} foi adicionado`,
        variant: "default",
      })
      form.reset()
      setNewCcEmail('')
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error creating client:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao criar cliente"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    let ccEmails: string[] = []
    if (client.cc_emails) {
      try {
        const parsed = JSON.parse(client.cc_emails)
        if (Array.isArray(parsed)) {
          ccEmails = parsed
        }
      } catch {
        // Ignore parse errors
      }
    }
    form.setFieldValue('name', client.name)
    form.setFieldValue('email', client.email)
    form.setFieldValue('requiresTimesheet', client.requires_timesheet === 1 || client.requires_timesheet === true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setFieldValue('ccEmails' as any, ccEmails)
    setNewCcEmail('')
    setDialogOpen(true)
  }

  const handleUpdateClient = async (value: ClientFormData) => {
    if (!editingClient) return

    try {
      await updateClientMutation.mutateAsync({
        clientId: editingClient.id,
        data: {
          name: value.name,
          email: value.email,
          requiresTimesheet: value.requiresTimesheet,
          ccEmails: value.ccEmails,
        },
      })
      toast({
        title: "Cliente Atualizado",
        description: `${value.name} foi atualizado`,
        variant: "default",
      })
      form.reset()
      setNewCcEmail('')
      setEditingClient(null)
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error updating client:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar cliente",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      await deleteClientMutation.mutateAsync(clientToDelete.id)
      toast({
        title: "Cliente Deletado",
        description: `${clientToDelete.name} foi deletado`,
        variant: "success",
      })
      setClientToDelete(null)
      setDeleteDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error deleting client:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao deletar cliente",
        variant: "destructive",
      })
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingClient(null)
    form.reset()
    setNewCcEmail('')
  }

  const addCcEmail = () => {
    const email = newCcEmail.trim()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentCcEmails = (form.getFieldValue('ccEmails' as any) || []) as string[]
    
    if (email && !currentCcEmails.includes(email)) {
      // Validate email format using zod
      const emailResult = z.string().email().safeParse(email)
      if (emailResult.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.setFieldValue('ccEmails' as any, [...currentCcEmails, email])
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentCcEmails = (form.getFieldValue('ccEmails' as any) || []) as string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setFieldValue('ccEmails' as any, currentCcEmails.filter(email => email !== emailToRemove))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando clientes...</p>
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
              Clientes
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum cliente ainda. Adicione seu primeiro cliente para começar.
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
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
          >
            <div className="space-y-4 py-4">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const result = clientSchema.shape.name.safeParse(value)
                    if (!result.success) {
                      return result.error.errors[0]?.message || 'Valor inválido'
                    }
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Nome do Cliente *</Label>
                    <input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Nome do Cliente"
                      className="w-full p-2 border rounded-md"
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const result = clientSchema.shape.email.safeParse(value)
                    if (!result.success) {
                      return result.error.errors[0]?.message || 'Valor inválido'
                    }
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email do Cliente *</Label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="cliente@exemplo.com"
                      className="w-full p-2 border rounded-md bg-background"
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="requiresTimesheet">
                {(field) => (
                  <div className="flex items-center space-x-2">
                    <input
                      id={field.name}
                      name={field.name}
                      type="checkbox"
                      checked={field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor={field.name} className="text-sm font-normal cursor-pointer">
                      Requer timesheet (ex: INDRA)
                    </Label>
                  </div>
                )}
              </form.Field>
              
              {/* CC Emails Section */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <form.Field name={"ccEmails" as any}>
                {(field) => (
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
                    {field.state.value && field.state.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(field.state.value as string[]).map((email: string, index: number) => (
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
                )}
              </form.Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingClient ? 'Atualizar Cliente' : 'Criar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá deletar permanentemente {clientToDelete?.name}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

