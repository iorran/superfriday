import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '@/lib/client/api'
import { queryKeys } from '@/lib/shared/query-keys'

interface CreateEmailTemplateData {
  subject: string
  body: string
  type: string
}

interface UpdateEmailTemplateData {
  subject?: string
  body?: string
  type?: string
}

/**
 * Query hook for fetching all email templates
 */
export const useEmailTemplates = () => {
  return useQuery({
    queryKey: queryKeys.emailTemplates.lists(),
    queryFn: getEmailTemplates,
  })
}

/**
 * Query hook for fetching a single email template by ID
 */
export const useEmailTemplate = (templateId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.emailTemplates.detail(templateId || ''),
    queryFn: () => getEmailTemplate(templateId!),
    enabled: !!templateId,
  })
}

/**
 * Mutation hook for creating a new email template
 */
export const useCreateEmailTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateEmailTemplateData) => createEmailTemplate(data),
    onSuccess: () => {
      // Invalidate and refetch email templates list
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.lists() })
    },
    onError: (error) => {
      console.error('Error creating email template:', error)
    },
  })
}

/**
 * Mutation hook for updating an email template
 */
export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateEmailTemplateData }) =>
      updateEmailTemplate(templateId, data),
    onSuccess: (_, variables) => {
      // Invalidate email templates list and specific template detail
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.detail(variables.templateId) })
    },
    onError: (error) => {
      console.error('Error updating email template:', error)
    },
  })
}

/**
 * Mutation hook for deleting an email template
 */
export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteEmailTemplate(templateId),
    onSuccess: (_, templateId) => {
      // Invalidate email templates list and remove specific template from cache
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.lists() })
      queryClient.removeQueries({ queryKey: queryKeys.emailTemplates.detail(templateId) })
    },
    onError: (error) => {
      console.error('Error deleting email template:', error)
    },
  })
}



