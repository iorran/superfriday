/**
 * Database Client
 * MongoDB operations for invoice management
 */

import { getDatabase } from './db'
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
  const db = await getDatabase()
  const clients = await db.collection('clients').find({}).sort({ name: 1 }).toArray()
  return clients.map((client) => ({
    ...client,
    name: client.name || '',
    email: client.email || '',
  })) as unknown as Client[]
}

/**
 * Get client by ID
 */
export async function getClient(clientId: string): Promise<Client | null> {
  const db = await getDatabase()
  const client = await db.collection('clients').findOne({ id: clientId })
  if (!client) return null
  return {
    ...client,
    name: client.name || '',
    email: client.email || '',
  } as unknown as Client
}

/**
 * Create a new client
 */
export async function createClient(data: CreateClientData) {
  const db = await getDatabase()
  const id = `client-${Date.now()}`
  const { name, email, requiresTimesheet, ccEmails } = data
  
  await db.collection('clients').insertOne({
    id,
    name,
    email,
    requires_timesheet: requiresTimesheet,
    cc_emails: ccEmails || null,
    created_at: new Date(),
    updated_at: null,
  })
  
  return id
}

/**
 * Update a client
 */
export async function updateClient(clientId: string, data: UpdateClientData) {
  const db = await getDatabase()
  const update: Record<string, unknown> = {
    updated_at: new Date(),
  }
  
  if (data.name !== undefined) update.name = data.name
  if (data.email !== undefined) update.email = data.email
  if (data.requiresTimesheet !== undefined) update.requires_timesheet = data.requiresTimesheet
  if (data.ccEmails !== undefined) update.cc_emails = data.ccEmails.length > 0 ? data.ccEmails : null
  
  await db.collection('clients').updateOne({ id: clientId }, { $set: update })
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string) {
  const db = await getDatabase()
  await db.collection('clients').deleteOne({ id: clientId })
}

/**
 * Get setting value
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase()
  const setting = await db.collection('settings').findOne({ key })
  return (setting?.value as string) || null
}

/**
 * Set setting value
 */
export async function setSetting(key: string, value: string) {
  const db = await getDatabase()
  await db.collection('settings').updateOne(
    { key },
    { $set: { key, value, updated_at: new Date() } },
    { upsert: true }
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
  const db = await getDatabase()
  
  // Get invoice
  const invoice = await db.collection('invoices').findOne({ id: invoiceId })
  if (!invoice) return null
  
  // Get client info
  const client = await db.collection('clients').findOne({ id: invoice.client_id })
  
  // Get files for this invoice
  const files = await db.collection('invoice_files')
    .find({ invoice_id: invoiceId })
    .sort({ file_type: 1, uploaded_at: 1 })
    .toArray()
  
  const result = {
    ...invoice,
    client_name: client?.name || '',
    client_email: client?.email || '',
    requires_timesheet: client?.requires_timesheet || false,
    files: files as unknown as InvoiceFile[],
  }
  return result as unknown as Invoice
}

/**
 * Get all invoices with client info and files
 */
export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDatabase()
  
  // Get all invoices sorted by year, month, uploaded_at
  const invoices = await db.collection('invoices')
    .find({})
    .sort({ year: -1, month: -1, uploaded_at: -1 })
    .toArray()
  
  // Get all clients for lookup
  const clients = await db.collection('clients').find({}).toArray()
  const clientMap = new Map(clients.map((c) => [c.id, c]))
  
  // Get all files grouped by invoice_id
  const allFiles = await db.collection('invoice_files').find({}).toArray()
  const filesByInvoice = new Map<string, InvoiceFile[]>()
  
  for (const file of allFiles) {
    const invoiceId = file.invoice_id as string
    if (!filesByInvoice.has(invoiceId)) {
      filesByInvoice.set(invoiceId, [])
    }
    filesByInvoice.get(invoiceId)!.push(file as unknown as InvoiceFile)
  }
  
  // Combine invoices with client info and files
  return invoices.map((invoice) => {
    const client = clientMap.get(invoice.client_id as string)
    const result = {
      ...invoice,
      client_name: client?.name || '',
      client_email: client?.email || '',
      requires_timesheet: client?.requires_timesheet || false,
      files: filesByInvoice.get(invoice.id as string) || [],
    }
    return result as unknown as Invoice
  })
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
  const db = await getDatabase()
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
  await db.collection('invoices').insertOne({
    id: invoiceId,
    client_id: clientId,
    invoice_amount: invoiceAmount,
    due_date: dueDate,
    month,
    year,
    notes: notes || null,
    uploaded_at: new Date(),
    sent_to_client: false,
    sent_to_client_at: null,
    payment_received: false,
    payment_received_at: null,
    sent_to_accountant: false,
    sent_to_accountant_at: null,
  })
  
  // Create invoice files
  if (files.length > 0) {
    const fileDocuments = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      invoice_id: invoiceId,
      file_key: file.fileKey,
      file_type: file.fileType,
      original_name: file.originalName,
      file_size: file.fileSize,
      uploaded_at: new Date(),
    }))
    
    await db.collection('invoice_files').insertMany(fileDocuments)
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
  const db = await getDatabase()
  const update: Record<string, unknown> = {}
  
  if (updates.sentToClient !== undefined) {
    update.sent_to_client = updates.sentToClient
    if (updates.sentToClient) {
      update.sent_to_client_at = new Date()
    }
  }
  
  if (updates.paymentReceived !== undefined) {
    update.payment_received = updates.paymentReceived
    if (updates.paymentReceived) {
      update.payment_received_at = new Date()
    }
  }
  
  if (updates.sentToAccountant !== undefined) {
    update.sent_to_accountant = updates.sentToAccountant
    if (updates.sentToAccountant) {
      update.sent_to_accountant_at = new Date()
    }
  }
  
  if (Object.keys(update).length > 0) {
    await db.collection('invoices').updateOne({ id: invoiceId }, { $set: update })
  }
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
  const db = await getDatabase()
  const {
    clientId,
    invoiceAmount,
    dueDate,
    month,
    year,
    filesToDelete,
    newFiles,
  } = updates

  // Update invoice fields
  const update: Record<string, unknown> = {}
  if (clientId !== undefined) update.client_id = clientId
  if (invoiceAmount !== undefined) update.invoice_amount = invoiceAmount
  if (dueDate !== undefined) update.due_date = dueDate
  if (month !== undefined) update.month = month
  if (year !== undefined) update.year = year

  if (Object.keys(update).length > 0) {
    await db.collection('invoices').updateOne({ id: invoiceId }, { $set: update })
  }

  // Delete files
  if (filesToDelete && filesToDelete.length > 0) {
    await db.collection('invoice_files').deleteMany({
      id: { $in: filesToDelete },
      invoice_id: invoiceId,
    })
  }

  // Add new files
  if (newFiles && newFiles.length > 0) {
    const fileDocuments = newFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      invoice_id: invoiceId,
      file_key: file.fileKey,
      file_type: file.fileType,
      original_name: file.originalName,
      file_size: file.fileSize,
      uploaded_at: new Date(),
    }))
    
    await db.collection('invoice_files').insertMany(fileDocuments)
  }
}

/**
 * Delete invoice and its files
 */
export async function deleteInvoice(invoiceId: string) {
  const db = await getDatabase()
  await db.collection('invoice_files').deleteMany({ invoice_id: invoiceId })
  await db.collection('email_history').deleteMany({ invoice_id: invoiceId })
  await db.collection('invoices').deleteOne({ id: invoiceId })
}

/**
 * Get email templates
 */
export async function getEmailTemplates() {
  const db = await getDatabase()
  const templates = await db.collection('email_templates')
    .find({})
    .sort({ type: 1, created_at: 1 })
    .toArray()
  return templates as unknown as EmailTemplate[]
}

/**
 * Get email template by ID
 */
export async function getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
  const db = await getDatabase()
  const template = await db.collection('email_templates').findOne({ id: templateId })
  return (template as EmailTemplate | null) || null
}

/**
 * Create email template
 */
export async function createEmailTemplate(templateData: CreateEmailTemplateData) {
  const db = await getDatabase()
  const id = `template-${Date.now()}`
  const { subject, body, type } = templateData
  
  await db.collection('email_templates').insertOne({
    id,
    subject,
    body,
    type,
    created_at: new Date(),
    updated_at: null,
  })
  
  return id
}

/**
 * Update email template
 */
export async function updateEmailTemplate(templateId: string, templateData: UpdateEmailTemplateData) {
  const db = await getDatabase()
  const update: Record<string, unknown> = {
    updated_at: new Date(),
  }
  
  if (templateData.subject !== undefined) update.subject = templateData.subject
  if (templateData.body !== undefined) update.body = templateData.body
  if (templateData.type !== undefined) update.type = templateData.type
  
  await db.collection('email_templates').updateOne({ id: templateId }, { $set: update })
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(templateId: string) {
  const db = await getDatabase()
  await db.collection('email_templates').deleteOne({ id: templateId })
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
  const db = await getDatabase()
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

  await db.collection('email_history').insertOne({
    id,
    invoice_id: invoiceId,
    template_id: templateId || null,
    recipient_email: recipientEmail,
    recipient_name: recipientName || null,
    recipient_type: recipientType,
    subject,
    body,
    status,
    error_message: errorMessage || null,
    sent_at: new Date(),
  })
  
  return id
}

/**
 * Get email history for an invoice
 */
export async function getEmailHistory(invoiceId: string) {
  const db = await getDatabase()
  
  // Get email history
  const emails = await db.collection('email_history')
    .find({ invoice_id: invoiceId })
    .sort({ sent_at: -1 })
    .toArray()
  
  // Get template names for lookup
  const templateIds = emails
    .map((e) => e.template_id)
    .filter((id): id is string => id !== null)
  
  const templates = templateIds.length > 0
    ? await db.collection('email_templates')
        .find({ id: { $in: templateIds } })
        .toArray()
    : []
  
  const templateMap = new Map(templates.map((t) => [t.id, t]))
  
  // Combine emails with template names
  return emails.map((email) => ({
    ...email,
    template_name: email.template_id ? templateMap.get(email.template_id)?.subject : null,
  }))
}
