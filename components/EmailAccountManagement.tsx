'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Plus, Edit, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { EmailAccount } from '@/types'
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// API functions
async function getEmailAccounts(): Promise<EmailAccount[]> {
  const response = await fetch('/api/email-accounts')
  if (!response.ok) {
    throw new Error('Failed to fetch email accounts')
  }
  return response.json()
}

async function createEmailAccount(data: {
  name: string
  email: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  is_default?: boolean
}): Promise<{ id: string }> {
  const response = await fetch('/api/email-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create email account')
  }
  return response.json()
}

async function updateEmailAccount(data: {
  id: string
  name?: string
  email?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_pass?: string
  is_default?: boolean
}): Promise<void> {
  const response = await fetch('/api/email-accounts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update email account')
  }
}

async function deleteEmailAccount(accountId: string): Promise<void> {
  const response = await fetch(`/api/email-accounts?id=${accountId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to delete email account')
  }
}

async function verifyEmailAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`/api/email/verify?accountId=${accountId}`)
  if (!response.ok) {
    return { success: false, error: 'Failed to verify account' }
  }
  return response.json()
}

export default function EmailAccountManagement() {
  const queryClient = useQueryClient()
  const { data: accounts = [], isLoading: loading } = useQuery({
    queryKey: ['emailAccounts'],
    queryFn: getEmailAccounts,
  })

  const createAccountMutation = useMutation({
    mutationFn: createEmailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailAccounts'] })
      toast({
        title: "Conta SMTP Criada",
        description: "A conta SMTP foi criada com sucesso",
        variant: "default",
      })
      formReset()
      setDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const updateAccountMutation = useMutation({
    mutationFn: updateEmailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailAccounts'] })
      toast({
        title: "Conta de Email Atualizada",
        description: "A conta de email foi atualizada com sucesso",
        variant: "default",
      })
      formReset()
      setDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: deleteEmailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailAccounts'] })
      toast({
        title: "Conta SMTP Deletada",
        description: "A conta SMTP foi deletada com sucesso",
        variant: "default",
      })
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<EmailAccount | null>(null)
  const [verifyingAccountId, setVerifyingAccountId] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<{ accountId: string; success: boolean; error?: string } | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    is_default: false,
  })

  const formReset = () => {
    setFormData({
      name: '',
      email: '',
      smtp_host: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_pass: '',
      is_default: false,
    })
    setEditingAccount(null)
  }

  const handleOpenDialog = (account?: EmailAccount) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        name: account.name,
        email: account.email,
        smtp_host: account.smtp_host,
        smtp_port: String(account.smtp_port),
        smtp_user: account.smtp_user,
        smtp_pass: '', // Don't show password
        is_default: account.is_default || false,
      })
    } else {
      formReset()
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.smtp_host || !formData.smtp_port || !formData.smtp_user) {
      toast({
        title: "Campos Obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    // If editing and password is empty, don't send it (keep existing)
    if (editingAccount) {
      const updateData: {
        id: string
        name: string
        email: string
        smtp_host: string
        smtp_port: number
        smtp_user: string
        smtp_pass?: string
        is_default: boolean
      } = {
        id: editingAccount.id,
        name: formData.name,
        email: formData.email,
        smtp_host: formData.smtp_host,
        smtp_port: parseInt(formData.smtp_port),
        smtp_user: formData.smtp_user,
        is_default: formData.is_default,
      }

      // Only include password if it was changed
      if (formData.smtp_pass) {
        updateData.smtp_pass = formData.smtp_pass
      }

      await updateAccountMutation.mutateAsync(updateData)
    } else {
      if (!formData.smtp_pass) {
        toast({
          title: "Senha Obrigatória",
          description: "A senha SMTP é obrigatória para criar uma nova conta",
          variant: "destructive",
        })
        return
      }

      await createAccountMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        smtp_host: formData.smtp_host,
        smtp_port: parseInt(formData.smtp_port),
        smtp_user: formData.smtp_user,
        smtp_pass: formData.smtp_pass,
        is_default: formData.is_default,
      })
    }
  }

  const handleVerify = async (accountId: string) => {
    setVerifyingAccountId(accountId)
    setVerificationResult(null)
    try {
      const result = await verifyEmailAccount(accountId)
      setVerificationResult({ accountId, ...result })
      if (result.success) {
        toast({
          title: "Verificação Bem-sucedida",
          description: "A conexão SMTP foi verificada com sucesso",
          variant: "default",
        })
      } else {
        toast({
          title: "Verificação Falhou",
          description: result.error || "Não foi possível verificar a conexão SMTP",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao verificar conta",
        variant: "destructive",
      })
    } finally {
      setVerifyingAccountId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando contas de email...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Contas SMTP</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as contas SMTP usadas para enviar invoices
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhuma conta SMTP configurada ainda.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Configure uma conta SMTP ou use as variáveis de ambiente (SMTP_HOST, SMTP_USER, etc.)
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{account.name}</h3>
                      {account.is_default && (
                        <span className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          <CheckCircle2 className="h-3 w-3" />
                          Padrão
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Email:</strong> {account.email}</p>
                      <p><strong>SMTP Host:</strong> {account.smtp_host}</p>
                      <p><strong>SMTP Port:</strong> {account.smtp_port}</p>
                      <p><strong>SMTP User:</strong> {account.smtp_user}</p>
                    </div>
                    {verificationResult?.accountId === account.id && (
                      <div className="mt-3">
                        {verificationResult.success ? (
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Conexão verificada com sucesso
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <XCircle className="h-4 w-4" />
                            {verificationResult.error || 'Falha na verificação'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerify(account.id)}
                      disabled={verifyingAccountId === account.id}
                    >
                      {verifyingAccountId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Verificar'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccountToDelete(account)
                        setDeleteDialogOpen(true)
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Editar Conta de Email' : 'Nova Conta de Email'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da conta SMTP para envio de emails
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Conta *</Label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded-md bg-background mt-1"
                placeholder="Ex: Conta Principal"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email (From) *</Label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border rounded-md bg-background mt-1"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp_host">SMTP Host *</Label>
                <input
                  id="smtp_host"
                  type="text"
                  value={formData.smtp_host}
                  onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background mt-1"
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="smtp_port">SMTP Port *</Label>
                <input
                  id="smtp_port"
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData({ ...formData, smtp_port: e.target.value })}
                  className="w-full p-2 border rounded-md bg-background mt-1"
                  placeholder="587"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="smtp_user">SMTP User *</Label>
              <input
                id="smtp_user"
                type="text"
                value={formData.smtp_user}
                onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                className="w-full p-2 border rounded-md bg-background mt-1"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="smtp_pass">
                SMTP Password {editingAccount ? '(deixe em branco para manter)' : '*'}
              </Label>
              <input
                id="smtp_pass"
                type="password"
                value={formData.smtp_pass}
                onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                className="w-full p-2 border rounded-md bg-background mt-1"
                placeholder="••••••••"
                required={!editingAccount}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_default"
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Usar como conta padrão
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  formReset()
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createAccountMutation.isPending || updateAccountMutation.isPending}>
                {createAccountMutation.isPending || updateAccountMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingAccount ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Conta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente a conta SMTP
              <strong className="block mt-2">&ldquo;{accountToDelete?.name}&rdquo;</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (accountToDelete) {
                  deleteAccountMutation.mutate(accountToDelete.id)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

