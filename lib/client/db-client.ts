/**
 * Database Client (Client-side)
 * Makes API calls to Next.js API routes
 */

import type { Client, Invoice, InvoiceFile, EmailTemplate } from '@/types'

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
 * Execute a SQL query via API
 */
async function executeQuery(sql: string, params: (string | number | boolean | null)[] = []) {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql,
      params,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Database query failed' }))
    throw new Error(error.message || `Database query failed with status ${response.status}`)
  }

  return await response.json()
}

/**
 * Get all clients
 */
export async function getClients(): Promise<Client[]> {
  const result = await executeQuery('SELECT * FROM clients ORDER BY name')
  return (result.results || []) as unknown as Client[]
}

/**
 * Get client by ID
 */
export async function getClient(clientId: string): Promise<Client | null> {
  const result = await executeQuery('SELECT * FROM clients WHERE id = ?', [clientId])
  return (result.results?.[0] || null) as Client | null
}

/**
 * Create a new client
 */
export async function createClient(data: CreateClientData) {
  const id = `client-${Date.now()}`
  const { name, email, requiresTimesheet, ccEmails } = data
  const ccEmailsJson = ccEmails && ccEmails.length > 0 ? JSON.stringify(ccEmails) : null
  await executeQuery(
    'INSERT INTO clients (id, name, email, requires_timesheet, cc_emails, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [id, name, email, requiresTimesheet ? 1 : 0, ccEmailsJson]
  )
  return id
}

/**
 * Update a client
 */
export async function updateClient(clientId: string, data: UpdateClientData) {
  const { name, email, requiresTimesheet, ccEmails } = data
  const ccEmailsJson = ccEmails && ccEmails.length > 0 ? JSON.stringify(ccEmails) : null
  await executeQuery(
    'UPDATE clients SET name = ?, email = ?, requires_timesheet = ?, cc_emails = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name ?? null, email ?? null, requiresTimesheet !== undefined ? (requiresTimesheet ? 1 : 0) : null, ccEmailsJson, clientId]
  )
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string) {
  await executeQuery('DELETE FROM clients WHERE id = ?', [clientId])
}

/**
 * Get invoice by ID with files
 */
export async function getInvoice(invoiceId: string) {
  const invoiceResult = await executeQuery(
    `SELECT i.*, c.name as client_name, c.email as client_email, c.requires_timesheet
     FROM invoices i 
     LEFT JOIN clients c ON i.client_id = c.id 
     WHERE i.id = ?`,
    [invoiceId]
  )
  const invoice = invoiceResult.results?.[0]
  
  if (!invoice) return null
  
  // Get files for this invoice
  const filesResult = await executeQuery(
    'SELECT * FROM invoice_files WHERE invoice_id = ? ORDER BY file_type, uploaded_at',
    [invoiceId]
  )
  invoice.files = filesResult.results || []
  
  return invoice
}

/**
 * Get all invoices with client info and files
 */
export async function getAllInvoices() {
  const result = await executeQuery(
    `SELECT i.*, c.name as client_name, c.email as client_email, c.requires_timesheet
     FROM invoices i 
     LEFT JOIN clients c ON i.client_id = c.id 
     ORDER BY i.year DESC, i.month DESC, i.uploaded_at DESC`
  )
  const invoices = result.results || []
  
  // Get files for each invoice
  for (const invoice of invoices) {
    const filesResult = await executeQuery(
      'SELECT * FROM invoice_files WHERE invoice_id = ? ORDER BY file_type, uploaded_at',
      [invoice.id]
    )
    invoice.files = filesResult.results || []
  }
  
  return invoices
}

/**
 * Create invoice with files
 */
export async function createInvoice(invoiceData: {
  clientId: string
  invoiceAmount: number
  dueDate: string
  month: number
  year: number
  notes?: string | null
  files: Array<{
    fileKey: string
    fileType: 'invoice' | 'timesheet'
    originalName: string
    fileSize: number
  }>
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
  dueDate?: string
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
export async function getEmailTemplates() {
  const result = await executeQuery('SELECT * FROM email_templates ORDER BY name')
  return result.results || []
}

/**
 * Get email template by ID
 */
export async function getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
  const result = await executeQuery('SELECT * FROM email_templates WHERE id = ?', [templateId])
  return (result.results?.[0] || null) as EmailTemplate | null
}

/**
 * Create email template
 */
export async function createEmailTemplate(templateData: CreateEmailTemplateData) {
  const id = `template-${Date.now()}`
  const { subject, body, type } = templateData
  await executeQuery(
    'INSERT INTO email_templates (id, subject, body, type, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [id, subject, body, type]
  )
  return id
}

/**
 * Update email template
 */
export async function updateEmailTemplate(templateId: string, templateData: UpdateEmailTemplateData) {
  const { subject, body, type } = templateData
  await executeQuery(
    'UPDATE email_templates SET subject = ?, body = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [subject ?? null, body ?? null, type ?? null, templateId]
  )
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(templateId: string) {
  await executeQuery('DELETE FROM email_templates WHERE id = ?', [templateId])
}

/**
 * Get email history for an invoice
 */
export async function getEmailHistory(invoiceId: string) {
  const result = await executeQuery(
    `SELECT eh.*, et.name as template_name
     FROM email_history eh
     LEFT JOIN email_templates et ON eh.template_id = et.id
     WHERE eh.invoice_id = ?
     ORDER BY eh.sent_at DESC`,
    [invoiceId]
  )
  return result.results || []
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
