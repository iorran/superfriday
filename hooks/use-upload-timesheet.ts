import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/shared/query-keys'

/**
 * Upload timesheet
 */
const uploadTimesheet = async (invoiceId: string, file: File): Promise<{ fileKey: string }> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/invoices/${invoiceId}/upload-timesheet`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload timesheet' }))
    throw new Error(error.message || `Failed to upload timesheet: ${response.status}`)
  }

  return await response.json()
}

/**
 * Hook for uploading timesheet
 */
export const useUploadTimesheet = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, file }: { invoiceId: string; file: File }) =>
      uploadTimesheet(invoiceId, file),
    onSuccess: (_, variables) => {
      // Invalidate invoices list and specific invoice detail
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) })
    },
    onError: (error) => {
      console.error('Error uploading timesheet:', error)
    },
  })
}
