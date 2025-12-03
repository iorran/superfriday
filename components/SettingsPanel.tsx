'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { getAccountantEmail, setAccountantEmail } from '@/lib/client/db-client'
import { Settings } from 'lucide-react'

export default function SettingsPanel() {
  const [accountantEmail, setAccountantEmailLocal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

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
      </CardContent>
    </Card>
  )
}

