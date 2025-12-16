import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/shared/query-keys'

/**
 * Upload signed PDF
 */
const uploadSignedPDF = async (invoiceId: string, file: File): Promise<{ fileKey: string }> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/invoices/${invoiceId}/upload-signed`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload signed PDF' }))
    throw new Error(error.message || `Failed to upload signed PDF: ${response.status}`)
  }

  return await response.json()
}

/**
 * Hook for uploading signed PDF
 */
export const useUploadSignedPDF = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, file }: { invoiceId: string; file: File }) =>
      uploadSignedPDF(invoiceId, file),
    onSuccess: (_, variables) => {
      // Invalidate invoices list and specific invoice detail
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) })
    },
    onError: (error) => {
      console.error('Error uploading signed PDF:', error)
    },
  })
}
