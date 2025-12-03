/**
 * Database Client
 * Wrapper around SQLite database operations
 */

import { executeQuery } from './db'
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

/**
 * Get all clients
 */
export async function getClients() {
  const result = executeQuery('SELECT * FROM clients ORDER BY name')
  return result.results || []
}

/**
 * Get client by ID
 */
export async function getClient(clientId: string): Promise<Client | null> {
  const result = executeQuery('SELECT * FROM clients WHERE id = ?', [clientId])
  return (result.results?.[0] || null) as Client | null
}

/**
 * Create a new client
 */
export async function createClient(data: CreateClientData) {
  const id = `client-${Date.now()}`
  const { name, email, requiresTimesheet, ccEmails } = data
  const ccEmailsJson = ccEmails && ccEmails.length > 0 ? JSON.stringify(ccEmails) : null
  executeQuery(
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
  executeQuery(
    'UPDATE clients SET name = ?, email = ?, requires_timesheet = ?, cc_emails = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name ?? null, email ?? null, requiresTimesheet !== undefined ? (requiresTimesheet ? 1 : 0) : null, ccEmailsJson, clientId]
  )
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string) {
  executeQuery('DELETE FROM clients WHERE id = ?', [clientId])
}

/**
 * Get setting value
 */
export async function getSetting(key: string): Promise<string | null> {
  const result = executeQuery('SELECT value FROM settings WHERE key = ?', [key])
  const row = result.results?.[0] as { value: string } | undefined
  return row?.value || null
}

/**
 * Set setting value
 */
export async function setSetting(key: string, value: string) {
  executeQuery(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
    [key, value]
  )
}

/**
 * Get accountant email (from settings)
 */
export async function getAccountantEmail(): Promise<string | null> {
  return await getSetting('accountant_email')
}

/**
 * Set accountant email (in settings)
 */
export async function setAccountantEmail(email: string) {
  await setSetting('accountant_email', email)
}

/**
 * Get invoice by ID with files
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const invoiceResult = executeQuery(
    `SELECT i.*, c.name as client_name, c.email as client_email, c.requires_timesheet
     FROM invoices i 
     LEFT JOIN clients c ON i.client_id = c.id 
     WHERE i.id = ?`,
    [invoiceId]
  )
  const invoice = invoiceResult.results?.[0] as unknown as Invoice | undefined
  
  if (!invoice) return null
  
  // Get files for this invoice
  const filesResult = executeQuery(
    'SELECT * FROM invoice_files WHERE invoice_id = ? ORDER BY file_type, uploaded_at',
    [invoiceId]
  )
  invoice.files = (filesResult.results || []) as unknown as InvoiceFile[]
  
  return invoice
}

/**
 * Get all invoices with client info and files
 */
export async function getAllInvoices(): Promise<Invoice[]> {
  const result = executeQuery(
    `SELECT i.*, c.name as client_name, c.email as client_email, c.requires_timesheet
     FROM invoices i 
     LEFT JOIN clients c ON i.client_id = c.id 
     ORDER BY i.year DESC, i.month DESC, i.uploaded_at DESC`
  )
  const invoices = (result.results || []) as Invoice[]
  
  // Get files for each invoice
  for (const invoice of invoices) {
    const filesResult = executeQuery(
      'SELECT * FROM invoice_files WHERE invoice_id = ? ORDER BY file_type, uploaded_at',
      [invoice.id]
    )
    invoice.files = (filesResult.results || []) as InvoiceFile[]
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
  const {
    clientId,
    invoiceAmount,
    dueDate,
    month,
    year,
    notes,
    files,
  } = invoiceData

  const invoiceId = `invoice-${Date.now()}`
  
  // Create invoice
  executeQuery(
    `INSERT INTO invoices 
     (id, client_id, invoice_amount, due_date, month, year, notes, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [invoiceId, clientId, invoiceAmount, dueDate, month, year, notes || null]
  )
  
  // Create invoice files
  for (const file of files) {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    executeQuery(
      `INSERT INTO invoice_files 
       (id, invoice_id, file_key, file_type, original_name, file_size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [fileId, invoiceId, file.fileKey, file.fileType, file.originalName, file.fileSize]
    )
  }
  
  return invoiceId
}

/**
 * Update invoice state
 */
export async function updateInvoiceState(invoiceId: string, updates: {
  sentToClient?: boolean
  paymentReceived?: boolean
  sentToAccountant?: boolean
}) {
  const {
    sentToClient,
    paymentReceived,
    sentToAccountant,
  } = updates

  const updatesList: string[] = []
  const params: (string | number | null)[] = []

  if (sentToClient !== undefined) {
    updatesList.push('sent_to_client = ?')
    params.push(sentToClient ? 1 : 0)
    if (sentToClient) {
      updatesList.push('sent_to_client_at = CURRENT_TIMESTAMP')
    }
  }

  if (paymentReceived !== undefined) {
    updatesList.push('payment_received = ?')
    params.push(paymentReceived ? 1 : 0)
    if (paymentReceived) {
      updatesList.push('payment_received_at = CURRENT_TIMESTAMP')
    }
  }

  if (sentToAccountant !== undefined) {
    updatesList.push('sent_to_accountant = ?')
    params.push(sentToAccountant ? 1 : 0)
    if (sentToAccountant) {
      updatesList.push('sent_to_accountant_at = CURRENT_TIMESTAMP')
    }
  }

  if (updatesList.length === 0) return

  params.push(invoiceId)
  const sql = `UPDATE invoices SET ${updatesList.join(', ')} WHERE id = ?`
  
  executeQuery(sql, params)
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
  const {
    clientId,
    invoiceAmount,
    dueDate,
    month,
    year,
    filesToDelete,
    newFiles,
  } = updates

  const updatesList: string[] = []
  const params: (string | number | null)[] = []

  if (clientId !== undefined) {
    updatesList.push('client_id = ?')
    params.push(clientId)
  }

  if (invoiceAmount !== undefined) {
    updatesList.push('invoice_amount = ?')
    params.push(invoiceAmount)
  }

  if (dueDate !== undefined) {
    updatesList.push('due_date = ?')
    params.push(dueDate)
  }

  if (month !== undefined) {
    updatesList.push('month = ?')
    params.push(month)
  }

  if (year !== undefined) {
    updatesList.push('year = ?')
    params.push(year)
  }

  // Update invoice fields if any
  if (updatesList.length > 0) {
    params.push(invoiceId)
    const sql = `UPDATE invoices SET ${updatesList.join(', ')} WHERE id = ?`
    executeQuery(sql, params)
  }

  // Delete files (deletion from storage is handled by API route)
  if (filesToDelete && filesToDelete.length > 0) {
    for (const fileId of filesToDelete) {
      // Delete from database (storage deletion handled by API route)
      executeQuery('DELETE FROM invoice_files WHERE id = ?', [fileId])
    }
  }

  // Add new files
  if (newFiles && newFiles.length > 0) {
    for (const file of newFiles) {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      executeQuery(
        `INSERT INTO invoice_files 
         (id, invoice_id, file_key, file_type, original_name, file_size, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [fileId, invoiceId, file.fileKey, file.fileType, file.originalName, file.fileSize]
      )
    }
  }
}

/**
 * Delete invoice and its files
 */
export async function deleteInvoice(invoiceId: string) {
  executeQuery('DELETE FROM invoice_files WHERE invoice_id = ?', [invoiceId])
  executeQuery('DELETE FROM email_history WHERE invoice_id = ?', [invoiceId])
  executeQuery('DELETE FROM invoices WHERE id = ?', [invoiceId])
}

/**
 * Get email templates
 */
export async function getEmailTemplates() {
  const result = executeQuery('SELECT * FROM email_templates ORDER BY type, created_at')
  return result.results || []
}

/**
 * Get email template by ID
 */
export async function getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
  const result = executeQuery('SELECT * FROM email_templates WHERE id = ?', [templateId])
  return (result.results?.[0] || null) as EmailTemplate | null
}

/**
 * Create email template
 */
export async function createEmailTemplate(templateData: CreateEmailTemplateData) {
  const id = `template-${Date.now()}`
  const { subject, body, type } = templateData
  executeQuery(
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
  executeQuery(
    'UPDATE email_templates SET subject = ?, body = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [subject ?? null, body ?? null, type ?? null, templateId]
  )
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(templateId: string) {
  executeQuery('DELETE FROM email_templates WHERE id = ?', [templateId])
}

/**
 * Record email in history
 */
export async function recordEmail(emailData: {
  invoiceId: string
  templateId?: string | null
  recipientEmail: string
  recipientName?: string | null
  recipientType: 'client' | 'accountant'
  subject: string
  body: string
  status?: string
  errorMessage?: string | null
}) {
  const id = `email-${Date.now()}`
  const {
    invoiceId,
    templateId,
    recipientEmail,
    recipientName,
    recipientType,
    subject,
    body,
    status = 'sent',
    errorMessage,
  } = emailData

  executeQuery(
    `INSERT INTO email_history 
     (id, invoice_id, template_id, recipient_email, recipient_name, recipient_type, subject, body, status, error_message, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [id, invoiceId, templateId ?? null, recipientEmail ?? null, recipientName ?? null, recipientType ?? null, subject ?? null, body ?? null, status ?? null, errorMessage ?? null]
  )
  
  return id
}

/**
 * Get email history for an invoice
 */
export async function getEmailHistory(invoiceId: string) {
  const result = executeQuery(
    `SELECT eh.*, et.subject as template_name
     FROM email_history eh
     LEFT JOIN email_templates et ON eh.template_id = et.id
     WHERE eh.invoice_id = ?
     ORDER BY eh.sent_at DESC`,
    [invoiceId]
  )
  return result.results || []
}
