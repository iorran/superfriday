'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Building2 } from 'lucide-react'

interface UserInfo {
  companyName: string
  address: string
  vat: string
  bankAccount: string
  iban: string
  bankAccountName: string
  vatPercentage: string
  gbpToEurRate: string
}

const UserInfoSettings = () => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    companyName: '',
    address: '',
    vat: '',
    bankAccount: '',
    iban: '',
    bankAccountName: '',
    vatPercentage: '0',
    gbpToEurRate: '1.15',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const loadUserInfo = useCallback(async () => {
    try {
      setLoading(true)
      const [companyName, address, vat, bankAccount, iban, bankAccountName, vatPercentage, gbpToEurRate] = await Promise.all([
        fetch('/api/settings?key=user_company_name').then(r => r.json()).then(d => d.value || ''),
        fetch('/api/settings?key=user_address').then(r => r.json()).then(d => d.value || ''),
        fetch('/api/settings?key=user_vat').then(r => r.json()).then(d => d.value || ''),
        fetch('/api/settings?key=user_bank_account').then(r => r.json()).then(d => d.value || ''),
        fetch('/api/settings?key=user_iban').then(r => r.json()).then(d => d.value || ''),
        fetch('/api/settings?key=user_bank_account_name').then(r => r.json()).then(d => d.value || ''),
        fetch('/api/settings?key=user_vat_percentage').then(r => r.json()).then(d => d.value || '0'),
        fetch('/api/settings?key=gbp_to_eur_rate').then(r => r.json()).then(d => d.value || '1.15'),
      ])

      setUserInfo({
        companyName,
        address,
        vat,
        bankAccount,
        iban,
        bankAccountName,
        vatPercentage,
        gbpToEurRate,
      })
    } catch (error) {
      console.error('Error loading user info:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar informações do usuário",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUserInfo()
  }, [loadUserInfo])

  const handleChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'user_company_name', value: userInfo.companyName }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'user_address', value: userInfo.address }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'user_vat', value: userInfo.vat }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'user_bank_account', value: userInfo.bankAccount }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'user_iban', value: userInfo.iban }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'user_bank_account_name', value: userInfo.bankAccountName }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'user_vat_percentage', value: userInfo.vatPercentage }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'gbp_to_eur_rate', value: userInfo.gbpToEurRate }),
        }),
      ])

      toast({
        title: "Informações Salvas",
        description: "Suas informações foram atualizadas com sucesso",
        variant: "default",
      })
    } catch (error: unknown) {
      console.error('Error saving user info:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao salvar informações"
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
          <p className="text-center text-muted-foreground">Carregando informações...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Informações da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nome da Empresa *</Label>
          <input
            id="companyName"
            type="text"
            value={userInfo.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder="Iorran Marcolino Unipessoal LDA"
            className="w-full p-2 border rounded-md bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço *</Label>
          <textarea
            id="address"
            value={userInfo.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Avenida 25 de Abril, 27, 4DT, Pontinha, 1675-185, Lisboa, Portugal"
            className="w-full p-2 border rounded-md bg-background min-h-[80px]"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vat">VAT *</Label>
          <input
            id="vat"
            type="text"
            value={userInfo.vat}
            onChange={(e) => handleChange('vat', e.target.value)}
            placeholder="517946602"
            className="w-full p-2 border rounded-md bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankAccount">Conta Bancária *</Label>
          <input
            id="bankAccount"
            type="text"
            value={userInfo.bankAccount}
            onChange={(e) => handleChange('bankAccount', e.target.value)}
            placeholder="343.10.003669-2"
            className="w-full p-2 border rounded-md bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="iban">IBAN *</Label>
          <input
            id="iban"
            type="text"
            value={userInfo.iban}
            onChange={(e) => handleChange('iban', e.target.value)}
            placeholder="PT50 0036 0343 9910 0036 6924 4"
            className="w-full p-2 border rounded-md bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankAccountName">Nome da Conta Bancária *</Label>
          <input
            id="bankAccountName"
            type="text"
            value={userInfo.bankAccountName}
            onChange={(e) => handleChange('bankAccountName', e.target.value)}
            placeholder="Iorran Marcolino Unipessoal LDA"
            className="w-full p-2 border rounded-md bg-background"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vatPercentage">Percentual de VAT (%)</Label>
          <input
            id="vatPercentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={userInfo.vatPercentage}
            onChange={(e) => handleChange('vatPercentage', e.target.value)}
            placeholder="0"
            className="w-full p-2 border rounded-md bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Percentual de VAT usado no cálculo da Invoice Bruta (ex: 23 para 23%)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gbpToEurRate">Taxa de Conversão GBP para EUR</Label>
          <input
            id="gbpToEurRate"
            type="number"
            step="0.0001"
            min="0"
            value={userInfo.gbpToEurRate}
            onChange={(e) => handleChange('gbpToEurRate', e.target.value)}
            placeholder="1.15"
            className="w-full p-2 border rounded-md bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Taxa de conversão provisória usada para converter valores em libras para euros ao enviar para o contador e nas finanças (ex: 1.15 significa que 1 GBP = 1.15 EUR)
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving || !userInfo.companyName.trim() || !userInfo.address.trim() || !userInfo.vat.trim() || !userInfo.bankAccount.trim() || !userInfo.iban.trim() || !userInfo.bankAccountName.trim()}
        >
          {saving ? 'Salvando...' : 'Salvar Informações'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default UserInfoSettings
