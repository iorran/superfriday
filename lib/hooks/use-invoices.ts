import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceState,
  deleteInvoice,
  deleteInvoiceFile,
} from '@/lib/client/db-client'
import { queryKeys } from '@/lib/query-keys'

interface CreateInvoiceData {
  clientId: string
  clientName?: string // Optional: name for new client if it needs to be created
  invoiceAmount: number
  month: number
  year: number
  files: Array<{
    fileKey: string
    fileType: 'invoice' | 'timesheet'
    originalName: string
    fileSize: number
  }>
}

interface UpdateInvoiceData {
  clientId?: string
  invoiceAmount?: number
  month?: number
  year?: number
  filesToDelete?: string[]
  newFiles?: Array<{
    fileKey: string
    fileType: 'invoice' | 'timesheet'
    originalName: string
    fileSize: number
  }>
}

interface UpdateInvoiceStateData {
  sentToClient?: boolean
  sentToAccountant?: boolean
}

/**
 * Query hook for fetching all invoices
 */
export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.lists(),
    queryFn: getAllInvoices,
  })
}

/**
 * Query hook for fetching a single invoice by ID
 */
export function useInvoice(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId || ''),
    queryFn: () => getInvoice(invoiceId!),
    enabled: !!invoiceId,
  })
}

/**
 * Mutation hook for creating a new invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateInvoiceData) => createInvoice(data),
    onSuccess: () => {
      // Invalidate and refetch invoices list
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
    },
    onError: (error) => {
      console.error('Error creating invoice:', error)
    },
  })
}

/**
 * Mutation hook for updating invoice details
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, updates }: { invoiceId: string; updates: UpdateInvoiceData }) =>
      updateInvoice(invoiceId, updates),
    onSuccess: (_, variables) => {
      // Invalidate invoices list and specific invoice detail
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) })
    },
    onError: (error) => {
      console.error('Error updating invoice:', error)
    },
  })
}

/**
 * Mutation hook for updating invoice workflow state
 */
export function useUpdateInvoiceState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, updates }: { invoiceId: string; updates: UpdateInvoiceStateData }) =>
      updateInvoiceState(invoiceId, updates),
    onSuccess: (_, variables) => {
      // Invalidate invoices list and specific invoice detail
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) })
    },
    onError: (error) => {
      console.error('Error updating invoice state:', error)
    },
  })
}

/**
 * Mutation hook for deleting an invoice
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(invoiceId),
    onSuccess: (_, invoiceId) => {
      // Invalidate invoices list and remove specific invoice from cache
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
      queryClient.removeQueries({ queryKey: queryKeys.invoices.detail(invoiceId) })
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error)
    },
  })
}

/**
 * Mutation hook for deleting an invoice file
 */
export function useDeleteInvoiceFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, fileId }: { invoiceId: string; fileId: string }) =>
      deleteInvoiceFile(invoiceId, fileId),
    onSuccess: (_, variables) => {
      // Invalidate invoices list and specific invoice detail to refetch files
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.invoiceId) })
    },
    onError: (error) => {
      console.error('Error deleting invoice file:', error)
    },
  })
}

