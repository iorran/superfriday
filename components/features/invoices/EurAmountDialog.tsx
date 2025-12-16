'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface EurAmountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceAmount: number | null
  clientCurrency: string
  onConfirm: (eurAmount: number) => void
  isLoading?: boolean
}

const EurAmountDialog = ({
  open,
  onOpenChange,
  invoiceAmount,
  clientCurrency,
  onConfirm,
  isLoading = false,
}: EurAmountDialogProps) => {
  const [eurAmount, setEurAmount] = useState<string>('')
  const [error, setError] = useState<string>('')

  // Calculate suggested EUR amount using conversion rate
  useEffect(() => {
    const loadSuggestedAmount = async () => {
      if (open && invoiceAmount && clientCurrency === 'GBP') {
        try {
          const response = await fetch('/api/settings?key=gbp_to_eur_rate')
          const data = await response.json()
          const rate = data.value ? parseFloat(data.value) : 1.15
          const suggested = invoiceAmount * rate
          setEurAmount(suggested.toFixed(2))
        } catch (error) {
          console.error('Error loading conversion rate:', error)
          // Fallback to default rate
          if (invoiceAmount) {
            const suggested = invoiceAmount * 1.15
            setEurAmount(suggested.toFixed(2))
          }
        }
      }
    }
    loadSuggestedAmount()
  }, [open, invoiceAmount, clientCurrency])

  const handleConfirm = () => {
    const amount = parseFloat(eurAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Por favor, insira um valor válido maior que zero')
      return
    }
    setError('')
    onConfirm(amount)
  }

  const handleCancel = () => {
    setEurAmount('')
    setError('')
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConfirm()
    }
  }

  if (clientCurrency !== 'GBP') {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Valor em EUR Recebido</DialogTitle>
          <DialogDescription>
            Por favor, insira o valor real recebido em EUR para esta invoice em GBP.
            Este valor será usado para os relatórios financeiros.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="eurAmount">
              Valor em EUR *
            </Label>
            <input
              id="eurAmount"
              type="number"
              step="0.01"
              min="0"
              value={eurAmount}
              onChange={(e) => {
                setEurAmount(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              className="w-full p-2 border rounded-md bg-background"
              disabled={isLoading}
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'eurAmount-error' : undefined}
            />
            {error && (
              <p id="eurAmount-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {invoiceAmount && (
              <p className="text-xs text-muted-foreground">
                Valor original em GBP: £{invoiceAmount.toFixed(2)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !eurAmount || parseFloat(eurAmount) <= 0}
          >
            {isLoading ? 'Enviando...' : 'Confirmar e Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EurAmountDialog
