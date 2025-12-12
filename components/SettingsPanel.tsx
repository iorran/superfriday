'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { getAccountantEmail, setAccountantEmail } from '@/lib/client/db-client'
import { Settings, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPanel() {
  const [accountantEmail, setAccountantEmailLocal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const email = await getAccountantEmail()
      setAccountantEmailLocal(email || '')
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    try {
      setSaving(true)
      await setAccountantEmail(accountantEmail)
      toast({
        title: "Configurações Salvas",
        description: "Email do contador atualizado com sucesso",
        variant: "default",
      })
    } catch (error: unknown) {
      console.error('Error saving settings:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao salvar configurações"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAllData = async () => {
    try {
      setDeleting(true)
      const response = await fetch('/api/user/delete-all-data', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user data')
      }

      toast({
        title: "Dados Deletados",
        description: "Todos os seus dados foram deletados com sucesso.",
        variant: "default",
      })

      // Redirect to home page after deletion
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1000)
    } catch (error: unknown) {
      console.error('Error deleting all user data:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao deletar dados"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações Gerais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="accountantEmail">Email do Contador *</Label>
          <input
            id="accountantEmail"
            type="email"
            value={accountantEmail}
            onChange={(e) => setAccountantEmailLocal(e.target.value)}
            placeholder="contador@exemplo.com"
            className="w-full p-2 border rounded-md bg-background"
            required
          />
          <p className="text-sm text-muted-foreground">
            Este email será usado para enviar invoices quando você marcar &ldquo;Enviar para Contador&rdquo;
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || !accountantEmail.trim()}>
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>

        <div className="pt-6 border-t">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-destructive">Zona de Perigo</h3>
            <p className="text-sm text-muted-foreground">
              Esta ação irá deletar permanentemente todos os seus dados, incluindo invoices, arquivos, clientes e configurações.
            </p>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar Todos os Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Esta ação <strong>não pode ser desfeita</strong>. Isso irá deletar permanentemente:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Todas as suas invoices</li>
                      <li>Todos os arquivos PDF anexados</li>
                      <li>Todos os seus clientes</li>
                      <li>Todas as contas de email configuradas</li>
                      <li>Todos os templates de email</li>
                      <li>Todas as configurações e preferências</li>
                    </ul>
                    <p className="font-semibold text-destructive mt-4">
                      Esta ação é irreversível!
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllData}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? 'Deletando...' : 'Sim, deletar tudo'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

