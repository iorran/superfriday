'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useClients } from '@/hooks/use-clients'
import { invoiceCreationSchema, type InvoiceCreationFormData } from '@/lib/shared/validations'
import { Plus, X } from 'lucide-react'
import type { Client } from '@/types'

interface Expense {
  description: string
  amount: number
}

interface InvoiceCreationFormProps {
  onSubmit: (data: InvoiceCreationFormData) => Promise<void>
  isLoading?: boolean
}

const InvoiceCreationForm = ({ onSubmit, isLoading = false }: InvoiceCreationFormProps) => {
  const { data: clients = [] } = useClients()
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [vatPercentage, setVatPercentage] = useState<number>(0)

  // Load VAT percentage from settings
  useEffect(() => {
    const loadVatPercentage = async () => {
      try {
        const response = await fetch('/api/settings?key=user_vat_percentage')
        const data = await response.json()
        const vat = data.value ? parseFloat(data.value) : 0
        setVatPercentage(vat)
      } catch (error) {
        console.error('Error loading VAT percentage:', error)
      }
    }
    loadVatPercentage()
  }, [])

  // Filter clients that have daily_rate set
  const clientsWithRate = useMemo(() => {
    return clients.filter((client: Client) => client.daily_rate && client.daily_rate > 0)
  }, [clients])

  // Generate 8 random characters for order number suggestion
  const generateOrderNumberSuggestion = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  // Get current date in YYYY-MM-DD format for invoice date suggestion
  const getCurrentDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const form = useForm({
    defaultValues: {
      clientId: '',
      periodStart: '',
      periodEnd: '',
      numberOfDays: 0,
      description: '',
      expenses: [] as Expense[],
      orderNumber: generateOrderNumberSuggestion(),
      invoiceNumber: 0,
      invoiceDate: getCurrentDate(),
      vatPercentage: 0,
    },
    onSubmit: async ({ value }: { value: InvoiceCreationFormData }) => {
      const result = invoiceCreationSchema.safeParse({
        ...value,
        expenses,
      })
      if (!result.success) {
        toast({
          title: "Erro de Validação",
          description: result.error.errors[0]?.message || "Por favor, verifique os campos",
          variant: "destructive",
        })
        return
      }
      await onSubmit(result.data)
    },
  })

  const clientId = useStore(form.store, (state) => state.values.clientId || '')
  const selectedClient = useMemo(() => {
    return clients.find((c: Client) => c.id === clientId) || null
  }, [clients, clientId])

  const dailyRate = selectedClient?.daily_rate || 0
  const numberOfDays = useStore(form.store, (state) => Number(state.values.numberOfDays) || 0)
  const clientCurrency = selectedClient?.currency || 'EUR'
  const currencySymbol = clientCurrency === 'GBP' ? '£' : '€'
  const formVatPercentage = useStore(form.store, (state) => Number(state.values.vatPercentage) || vatPercentage)
  
  // Calculate net service charge - updates when client or numberOfDays changes
  const netServiceCharge = useMemo(() => {
    if (!selectedClient || !numberOfDays || numberOfDays <= 0) {
      return 0
    }
    return numberOfDays * dailyRate
  }, [numberOfDays, dailyRate, selectedClient])

  const expensesTotal = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  }, [expenses])

  const netInvoice = useMemo(() => {
    return netServiceCharge + expensesTotal
  }, [netServiceCharge, expensesTotal])

  // Calculate gross invoice with VAT - updates when netInvoice or vatPercentage changes
  const grossInvoice = useMemo(() => {
    return netInvoice * (1 + (formVatPercentage / 100))
  }, [netInvoice, formVatPercentage])

  const handleAddExpense = () => {
    setExpenses([...expenses, { description: '', amount: 0 }])
  }

  const handleRemoveExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index))
  }

  const handleExpenseChange = (index: number, field: keyof Expense, value: string | number) => {
    const updated = [...expenses]
    updated[index] = { ...updated[index], [field]: value }
    setExpenses(updated)
  }

  if (clientsWithRate.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Nenhum cliente com taxa diária configurada. Por favor, configure a taxa diária dos clientes antes de criar invoices.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6"
        >
          <form.Field
            name="clientId"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === '') {
                  return 'Cliente é obrigatório'
                }
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Cliente *</Label>
                <select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  disabled={isLoading}
                  aria-required="true"
                  aria-invalid={field.state.meta.errors && field.state.meta.errors.length > 0}
                >
                  <option value="">Selecione um cliente...</option>
                  {clientsWithRate.map((client: Client) => {
                    const clientCurrencySymbol = client.currency === 'GBP' ? '£' : '€'
                    return (
                      <option key={client.id} value={client.id}>
                        {client.name} ({clientCurrencySymbol}{client.daily_rate?.toFixed(2)}/dia)
                      </option>
                    )
                  })}
                </select>
                {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive" role="alert">
                    {field.state.meta.errors[0]}
                  </p>
                )}
                {selectedClient && (
                  <p className="text-sm text-muted-foreground">
                    Taxa diária: {currencySymbol}{dailyRate.toFixed(2)}
                    {selectedClient.po_number && ` | PO: ${selectedClient.po_number}`}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="periodStart"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Data de início é obrigatória'
                  }
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Data de Início *</Label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={field.state.meta.errors && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive" role="alert">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="periodEnd"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Data de fim é obrigatória'
                  }
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Data de Fim *</Label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={field.state.meta.errors && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive" role="alert">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <form.Field
            name="numberOfDays"
            validators={{
              onChange: ({ value }) => {
                if (!value || value <= 0) {
                  return 'Número de dias deve ser positivo'
                }
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Número de Dias Trabalhados *</Label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min="0"
                    step="0.01"
                    value={field.state.value || ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const value = e.target.value
                      const numValue = value === '' ? 0 : parseFloat(value)
                      field.handleChange(numValue)
                    }}
                    className="w-full p-2 border rounded-md bg-background"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={field.state.meta.errors && field.state.meta.errors.length > 0}
                  />
                {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive" role="alert">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Descrição (Opcional)</Label>
                <textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value || ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background min-h-[80px]"
                  disabled={isLoading}
                  placeholder="Descrição adicional da invoice..."
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-3 gap-4">
            <form.Field
              name="orderNumber"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Número de pedido é obrigatório'
                  }
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Número de Pedido *</Label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={field.state.meta.errors && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive" role="alert">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="invoiceNumber"
              validators={{
                onChange: ({ value }) => {
                  const numValue = Number(value)
                  if (!value || isNaN(numValue) || numValue <= 0) {
                    return 'Número da invoice deve ser um número positivo'
                  }
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Número da Invoice *</Label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min="1"
                    step="1"
                    value={field.state.value || ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || (!isNaN(Number(value)) && Number(value) > 0)) {
                        field.handleChange(value === '' ? 0 : Number(value))
                      }
                    }}
                    className="w-full p-2 border rounded-md bg-background"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={field.state.meta.errors && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive" role="alert">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="invoiceDate"
              validators={{
                onChange: ({ value }) => {
                  if (!value || value.trim() === '') {
                    return 'Data da invoice é obrigatória'
                  }
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Data da Invoice *</Label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={field.state.meta.errors && field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive" role="alert">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <form.Field
            name="vatPercentage"
            validators={{
              onChange: ({ value }) => {
                const numValue = Number(value)
                if (value !== undefined && value !== null && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
                  return 'VAT deve ser um número entre 0 e 100'
                }
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>VAT (%)</Label>
                <input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={field.state.value || ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100)) {
                      field.handleChange(value === '' ? 0 : Number(value))
                    }
                  }}
                  className="w-full p-2 border rounded-md bg-background"
                  disabled={isLoading}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Percentual de VAT usado no cálculo da Invoice Bruta (ex: 23 para 23%)
                </p>
                {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive" role="alert">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Despesas</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExpense}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Despesa
              </Button>
            </div>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa adicionada</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={expense.description}
                      onChange={(e) => handleExpenseChange(index, 'description', e.target.value)}
                      placeholder="Descrição"
                      className="flex-1 p-2 border rounded-md bg-background"
                      disabled={isLoading}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={expense.amount || ''}
                      onChange={(e) => handleExpenseChange(index, 'amount', e.target.value ? parseFloat(e.target.value) : 0)}
                      placeholder="0.00"
                      className="w-32 p-2 border rounded-md bg-background"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExpense(index)}
                      disabled={isLoading}
                      className="h-10 w-10 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cobrança de Serviço Líquida:</span>
              <span className="text-sm font-semibold">{currencySymbol}{netServiceCharge.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de Despesas:</span>
              <span className="text-sm font-semibold">{currencySymbol}{expensesTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-base font-semibold">Invoice Líquida:</span>
              <span className="text-base font-bold">{currencySymbol}{netInvoice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Invoice Bruta:</span>
              <span className="text-base font-bold">{currencySymbol}{grossInvoice.toFixed(2)}</span>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Gerando PDF...' : 'Gerar PDF da Invoice'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default InvoiceCreationForm
