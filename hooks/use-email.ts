import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sendEmail, getEmailHistory, getAccountantEmail, setAccountantEmail } from '@/lib/client/api'
import { queryKeys } from '@/lib/shared/query-keys'

interface SendEmailData {
  invoiceId: string
  recipientType: 'client' | 'accountant'
  templateId?: string | null
  subject?: string
  body?: string
}

/**
 * Mutation hook for sending emails
 */
export const useSendEmail = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SendEmailData) => sendEmail(data),
    onSuccess: (_, variables) => {
      // Invalidate email history for the invoice
      queryClient.invalidateQueries({ queryKey: queryKeys.emailHistory.byInvoice(variables.invoiceId) })
      // Also invalidate the invoice to update workflow state
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
    },
    onError: (error) => {
      console.error('Error sending email:', error)
    },
  })
}

/**
 * Query hook for fetching email history for an invoice
 */
export const useEmailHistory = (invoiceId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.emailHistory.byInvoice(invoiceId || ''),
    queryFn: () => getEmailHistory(invoiceId!),
    enabled: !!invoiceId,
  })
}

/**
 * Query hook for fetching accountant email from settings
 */
export const useAccountantEmail = () => {
  return useQuery({
    queryKey: queryKeys.settings.accountantEmail(),
    queryFn: getAccountantEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change often
  })
}

/**
 * Mutation hook for setting accountant email
 */
export const useSetAccountantEmail = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => setAccountantEmail(email),
    onSuccess: () => {
      // Invalidate accountant email query
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.accountantEmail() })
    },
    onError: (error) => {
      console.error('Error setting accountant email:', error)
    },
  })
}



