/**
 * Query keys for React Query
 * Centralized query key factory for consistent cache management
 */

export const queryKeys = {
  // Clients
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.clients.lists(), { filters }] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clients.details(), id] as const,
  },

  // Invoices
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.invoices.lists(), { filters }] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
  },

  // Email Templates
  emailTemplates: {
    all: ['emailTemplates'] as const,
    lists: () => [...queryKeys.emailTemplates.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.emailTemplates.lists(), { filters }] as const,
    details: () => [...queryKeys.emailTemplates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.emailTemplates.details(), id] as const,
  },

  // Email History
  emailHistory: {
    all: ['emailHistory'] as const,
    byInvoice: (invoiceId: string) => [...queryKeys.emailHistory.all, 'invoice', invoiceId] as const,
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    accountantEmail: () => [...queryKeys.settings.all, 'accountantEmail'] as const,
  },

  // Finances
  finances: {
    all: () => ['finances'] as const,
  },
}



