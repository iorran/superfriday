/**
 * API Client (Client-side)
 * Makes API calls to Next.js API routes
 */

import type { Client, EmailTemplate, Invoice } from '@/types'

interface CreateClientData {
  name: string
  email: string
  requiresTimesheet: boolean
  ccEmails?: string[]
  dailyRate?: number
  poNumber?: string | null
  address?: string | null
  vat?: string | null
  currency?: string | null
}

interface UpdateClientData {
  name?: string
  email?: string
  requiresTimesheet?: boolean
  ccEmails?: string[]
  dailyRate?: number
  poNumber?: string | null
  address?: string | null
  vat?: string | null
  currency?: string | null
}

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

interface SendEmailData {
  invoiceId: string
  recipientType: 'client' | 'accountant'
  templateId?: string | null
  subject?: string
  body?: string
  invoiceAmountEur?: number // Manual EUR amount for GBP invoices
}

/**
 * Get all clients
 */
export const getClients = async (): Promise<Client[]> => {
  const response = await fetch('/api/clients')
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch clients' }))
    throw new Error(error.message || `Failed to fetch clients: ${response.status}`)
  }
  return await response.json()
}

/**
 * Get client by ID
 */
export const getClient = async (clientId: string): Promise<Client | null> => {
  const response = await fetch(`/api/clients?id=${clientId}`)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.json().catch(() => ({ message: 'Failed to fetch client' }))
    throw new Error(error.message || `Failed to fetch client: ${response.status}`)
  }
  return await response.json()
}

/**
 * Create a new client
 */
export const createClient = async (data: CreateClientData) => {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create client' }))
    throw new Error(error.message || `Failed to create client: ${response.status}`)
  }

  const result = await response.json()
  return result.id
}

/**
 * Update a client
 */
export const updateClient = async (clientId: string, data: UpdateClientData) => {
  const response = await fetch('/api/clients', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: clientId, ...data }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update client' }))
    throw new Error(error.message || `Failed to update client: ${response.status}`)
  }
}

/**
 * Delete a client
 */
export const deleteClient = async (clientId: string) => {
  const response = await fetch(`/api/clients?id=${clientId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete client' }))
    throw new Error(error.message || `Failed to delete client: ${response.status}`)
  }
}

/**
 * Get invoice by ID with files
 */
export const getInvoice = async (invoiceId: string): Promise<Invoice | null> => {
  const response = await fetch(`/api/invoices/${invoiceId}`)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.json().catch(() => ({ message: 'Failed to fetch invoice' }))
    throw new Error(error.message || `Failed to fetch invoice: ${response.status}`)
  }
  return await response.json()
}

/**
 * Get all invoices with client info and files
 */
export const getAllInvoices = async (): Promise<Invoice[]> => {
  const response = await fetch('/api/invoices')
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch invoices' }))
    throw new Error(error.message || `Failed to fetch invoices: ${response.status}`)
  }
  return await response.json()
}

/**
 * Create invoice with files
 */
export const createInvoice = async (invoiceData: {
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
  isOldImport?: boolean // Optional: if true, marks invoice as already sent to client
}) => {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create invoice' }))
    throw new Error(error.message || `Failed to create invoice: ${response.status}`)
  }

  return await response.json()
}

/**
 * Update invoice state
 */
export const updateInvoiceState = async (invoiceId: string, updates: {
  sentToClient?: boolean
  paymentReceived?: boolean
  sentToAccountant?: boolean
}) => {
  const response = await fetch(`/api/invoices/${invoiceId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update invoice state' }))
    throw new Error(error.message || `Failed to update invoice state: ${response.status}`)
  }

  return await response.json()
}

/**
 * Update invoice details
 */
export const updateInvoice = async (invoiceId: string, updates: {
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
}) => {
  const response = await fetch(`/api/invoices/${invoiceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update invoice' }))
    throw new Error(error.message || `Failed to update invoice: ${response.status}`)
  }

  return await response.json()
}

/**
 * Delete an invoice file
 */
export const deleteInvoiceFile = async (invoiceId: string, fileId: string) => {
  const response = await fetch(`/api/invoices/${invoiceId}/files?fileId=${fileId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete file' }))
    throw new Error(error.message || `Failed to delete file: ${response.status}`)
  }

  return await response.json()
}

/**
 * Delete invoice and its files
 */
export const deleteInvoice = async (invoiceId: string) => {
  const response = await fetch(`/api/invoices/${invoiceId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete invoice' }))
    throw new Error(error.message || `Failed to delete invoice: ${response.status}`)
  }

  return await response.json()
}

/**
 * Send email
 */
export const sendEmail = async (data: SendEmailData) => {
  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send email' }))
    throw new Error(error.message || `Failed to send email: ${response.status}`)
  }

  return await response.json()
}

/**
 * Get email templates
 */
export const getEmailTemplates = async (): Promise<EmailTemplate[]> => {
  const response = await fetch('/api/email-templates')
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch email templates' }))
    throw new Error(error.message || `Failed to fetch email templates: ${response.status}`)
  }
  return await response.json()
}

/**
 * Get email template by ID
 */
export const getEmailTemplate = async (templateId: string): Promise<EmailTemplate | null> => {
  const response = await fetch(`/api/email-templates?id=${templateId}`)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.json().catch(() => ({ message: 'Failed to fetch email template' }))
    throw new Error(error.message || `Failed to fetch email template: ${response.status}`)
  }
  return await response.json()
}

/**
 * Create email template
 */
export const createEmailTemplate = async (templateData: CreateEmailTemplateData) => {
  const response = await fetch('/api/email-templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(templateData),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create email template' }))
    throw new Error(error.message || `Failed to create email template: ${response.status}`)
  }

  const result = await response.json()
  return result.id
}

/**
 * Update email template
 */
export const updateEmailTemplate = async (templateId: string, templateData: UpdateEmailTemplateData) => {
  const response = await fetch('/api/email-templates', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: templateId, ...templateData }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update email template' }))
    throw new Error(error.message || `Failed to update email template: ${response.status}`)
  }
}

/**
 * Delete email template
 */
export const deleteEmailTemplate = async (templateId: string) => {
  const response = await fetch(`/api/email-templates?id=${templateId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete email template' }))
    throw new Error(error.message || `Failed to delete email template: ${response.status}`)
  }
}

/**
 * Get email history for an invoice
 */
export const getEmailHistory = async (invoiceId: string) => {
  const response = await fetch(`/api/invoices/${invoiceId}/email-history`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch email history' }))
    throw new Error(error.message || `Failed to fetch email history: ${response.status}`)
  }
  return await response.json()
}

/**
 * Get accountant email from settings
 */
export const getAccountantEmail = async (): Promise<string | null> => {
  const response = await fetch('/api/settings?key=accountant_email', {
    method: 'GET',
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data.value || null
}

/**
 * Set accountant email in settings
 */
export const setAccountantEmail = async (email: string): Promise<void> => {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: 'accountant_email', value: email }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to save settings' }))
    throw new Error(error.message || `Failed to save settings: ${response.status}`)
  }
}

/**
 * User Preferences
 */

export interface UserPreferences {
  user_id?: string
  tour_completed?: boolean
  tour_version?: string
  [key: string]: unknown
}

/**
 * Get user preferences
 */
export const getUserPreferences = async (): Promise<UserPreferences> => {
  const response = await fetch('/api/user-preferences')
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch preferences' }))
    throw new Error(error.message || `Failed to fetch preferences: ${response.status}`)
  }
  const data = await response.json()
  return data.preferences || {}
}

/**
 * Get a specific user preference
 */
export const getUserPreference = async (key: string): Promise<unknown> => {
  const response = await fetch(`/api/user-preferences?key=${encodeURIComponent(key)}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch preference' }))
    throw new Error(error.message || `Failed to fetch preference: ${response.status}`)
  }
  const data = await response.json()
  return data.value
}

/**
 * Set a user preference
 */
export const setUserPreference = async (key: string, value: unknown): Promise<void> => {
  const response = await fetch('/api/user-preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, value }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to save preference' }))
    throw new Error(error.message || `Failed to save preference: ${response.status}`)
  }
}

/**
 * Update multiple user preferences
 */
export const updateUserPreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
  const response = await fetch('/api/user-preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ preferences }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update preferences' }))
    throw new Error(error.message || `Failed to update preferences: ${response.status}`)
  }
}



