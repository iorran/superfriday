import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClients, getClient, createClient, updateClient, deleteClient } from '@/lib/client/api'
import { queryKeys } from '@/lib/shared/query-keys'

interface CreateClientData {
  name: string
  email: string
  requiresTimesheet: boolean
  ccEmails?: string[]
}

interface UpdateClientData {
  name?: string
  email?: string
  requiresTimesheet?: boolean
  ccEmails?: string[]
}

/**
 * Query hook for fetching all clients
 */
export const useClients = () => {
  return useQuery({
    queryKey: queryKeys.clients.lists(),
    queryFn: getClients,
  })
}

/**
 * Query hook for fetching a single client by ID
 */
export const useClient = (clientId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.clients.detail(clientId || ''),
    queryFn: () => getClient(clientId!),
    enabled: !!clientId,
  })
}

/**
 * Mutation hook for creating a new client
 */
export const useCreateClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateClientData) => createClient(data),
    onSuccess: () => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() })
    },
    onError: (error) => {
      console.error('Error creating client:', error)
    },
  })
}

/**
 * Mutation hook for updating a client
 */
export const useUpdateClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: UpdateClientData }) =>
      updateClient(clientId, data),
    onSuccess: (_, variables) => {
      // Invalidate clients list and specific client detail
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) })
      // Also invalidate invoices since they depend on client data
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
    },
    onError: (error) => {
      console.error('Error updating client:', error)
    },
  })
}

/**
 * Mutation hook for deleting a client
 */
export const useDeleteClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clientId: string) => deleteClient(clientId),
    onSuccess: (_, clientId) => {
      // Invalidate clients list and remove specific client from cache
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() })
      queryClient.removeQueries({ queryKey: queryKeys.clients.detail(clientId) })
      // Also invalidate invoices since they depend on client data
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
    },
    onError: (error) => {
      console.error('Error deleting client:', error)
    },
  })
}

