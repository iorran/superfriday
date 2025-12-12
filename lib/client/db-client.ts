/**
 * Database Client (Client-side)
 * Makes API calls to Next.js API routes
 */

import type { Client, EmailTemplate, Invoice } from '@/types'

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
}

/**
 * Get all clients
 */
export async function getClients(): Promise<Client[]> {
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
export async function getClient(clientId: string): Promise<Client | null> {
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
export async function createClient(data: CreateClientData) {
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
export async function updateClient(clientId: string, data: UpdateClientData) {
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
export async function deleteClient(clientId: string) {
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
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
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
export async function getAllInvoices(): Promise<Invoice[]> {
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
export async function createInvoice(invoiceData: {
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
}) {
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
export async function updateInvoiceState(invoiceId: string, updates: {
  sentToClient?: boolean
  paymentReceived?: boolean
  sentToAccountant?: boolean
}) {
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
export async function updateInvoice(invoiceId: string, updates: {
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
}) {
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
export async function deleteInvoiceFile(invoiceId: string, fileId: string) {
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
export async function deleteInvoice(invoiceId: string) {
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
export async function sendEmail(data: SendEmailData) {
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
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
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
export async function getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
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
export async function createEmailTemplate(templateData: CreateEmailTemplateData) {
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
export async function updateEmailTemplate(templateId: string, templateData: UpdateEmailTemplateData) {
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
export async function deleteEmailTemplate(templateId: string) {
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
export async function getEmailHistory(invoiceId: string) {
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
export async function getAccountantEmail(): Promise<string | null> {
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
export async function setAccountantEmail(email: string): Promise<void> {
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
  [key: string]: any
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
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
export async function getUserPreference(key: string): Promise<any> {
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
export async function setUserPreference(key: string, value: any): Promise<void> {
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
export async function updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
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
