'use client'

import { Label } from '@/components/ui/label'

interface InvoiceFormFieldsProps {
  invoiceAmount: number
  month: number
  year: number
  onInvoiceAmountChange: (value: number) => void
  onMonthChange: (value: number) => void
  onYearChange: (value: number) => void
  onBlur?: () => void
  disabled?: boolean
  showAmountError?: boolean
  amountErrorMessage?: string
}

const InvoiceFormFields = ({
  invoiceAmount,
  month,
  year,
  onInvoiceAmountChange,
  onMonthChange,
  onYearChange,
  onBlur,
  disabled = false,
  showAmountError = false,
  amountErrorMessage,
}: InvoiceFormFieldsProps) => {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : 0
    onInvoiceAmountChange(value)
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(parseInt(e.target.value))
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onYearChange(parseInt(e.target.value))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label htmlFor="invoiceAmount">Valor da Invoice *</Label>
          <input
            id="invoiceAmount"
            name="invoiceAmount"
            type="number"
            step="0.01"
            value={invoiceAmount || ''}
            onBlur={onBlur}
            onChange={handleAmountChange}
            placeholder="0.00"
            className="w-full p-2 border rounded-md bg-background"
            disabled={disabled}
            aria-label="Valor da invoice"
            aria-required="true"
            aria-invalid={showAmountError}
            aria-describedby={showAmountError ? 'amount-error' : undefined}
          />
          {showAmountError && amountErrorMessage && (
            <p id="amount-error" className="text-sm text-destructive" role="alert">
              {amountErrorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="month">Mês</Label>
          <select
            id="month"
            name="month"
            value={month}
            onBlur={onBlur}
            onChange={handleMonthChange}
            className="w-full p-2 border rounded-md bg-background"
            disabled={disabled}
            aria-label="Mês da invoice"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Ano</Label>
          <input
            id="year"
            name="year"
            type="number"
            value={year}
            onBlur={onBlur}
            onChange={handleYearChange}
            className="w-full p-2 border rounded-md bg-background"
            disabled={disabled}
            min="2020"
            max="2100"
            aria-label="Ano da invoice"
          />
        </div>
      </div>
    </div>
  )
}

export default InvoiceFormFields




