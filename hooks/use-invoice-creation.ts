import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InvoiceCreationFormData } from '@/lib/shared/validations'
import { queryKeys } from '@/lib/shared/query-keys'

/**
 * Generate PDF invoice
 */
const generatePDFInvoice = async (data: InvoiceCreationFormData): Promise<void> => {
  const response = await fetch('/api/invoices/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to generate PDF' }))
    throw new Error(error.message || `Failed to generate PDF: ${response.status}`)
  }

  // Calculate filename from periodStart: year.month.pdf (e.g., 2024.01.pdf)
  const periodStartDate = new Date(data.periodStart)
  const year = periodStartDate.getFullYear()
  const month = String(periodStartDate.getMonth() + 1).padStart(2, '0')
  const fileName = `${year}.${month}.pdf`

  // Get the PDF blob and trigger download
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

/**
 * Hook for creating invoices with PDF generation
 */
export const useInvoiceCreation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InvoiceCreationFormData) => generatePDFInvoice(data),
    onSuccess: () => {
      // Invalidate and refetch invoices list to show the newly created invoice
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
    },
    onError: (error) => {
      console.error('Error creating invoice:', error)
    },
  })
}
