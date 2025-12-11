/**
 * Database Client
 * MongoDB operations for invoice management
 */

import { getDatabase } from './db'
import type { Client, Invoice, EmailTemplate, EmailAccount } from '@/types'

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

interface CreateEmailAccountData {
  name: string
  email: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  is_default?: boolean
}

interface UpdateEmailAccountData {
  name?: string
  email?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_pass?: string
  is_default?: boolean
}

/**
 * Get all clients
 */
export async function getClients(userId: string) {
  const db = await getDatabase()
  const clients = await db.collection('clients').find({ user_id: userId }).sort({ name: 1 }).toArray()
  return clients.map((client) => ({
    ...client,
    name: client.name || '',
    email: client.email || '',
  })) as unknown as Client[]
}

/**
 * Get client by ID
 */
export async function getClient(clientId: string, userId: string): Promise<Client | null> {
  const db = await getDatabase()
  const client = await db.collection('clients').findOne({ id: clientId, user_id: userId })
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
export async function createClient(data: CreateClientData, userId: string) {
  const db = await getDatabase()
  const id = `client-${Date.now()}`
  const { name, email, requiresTimesheet, ccEmails } = data
  
  await db.collection('clients').insertOne({
    id,
    user_id: userId,
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
export async function updateClient(clientId: string, data: UpdateClientData, userId: string) {
  const db = await getDatabase()
  const update: Record<string, unknown> = {
    updated_at: new Date(),
  }
  
  if (data.name !== undefined) update.name = data.name
  if (data.email !== undefined) update.email = data.email
  if (data.requiresTimesheet !== undefined) update.requires_timesheet = data.requiresTimesheet
  if (data.ccEmails !== undefined) update.cc_emails = data.ccEmails.length > 0 ? data.ccEmails : null
  
  await db.collection('clients').updateOne({ id: clientId, user_id: userId }, { $set: update })
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string, userId: string) {
  const db = await getDatabase()
  await db.collection('clients').deleteOne({ id: clientId, user_id: userId })
}

/**
 * Get setting value
 */
export async function getSetting(key: string, userId: string): Promise<string | null> {
  const db = await getDatabase()
  const setting = await db.collection('settings').findOne({ key, user_id: userId })
  return (setting?.value as string) || null
}

/**
 * Set setting value
 */
export async function setSetting(key: string, value: string, userId: string) {
  const db = await getDatabase()
  await db.collection('settings').updateOne(
    { key, user_id: userId },
    { $set: { key, value, user_id: userId, updated_at: new Date() } },
    { upsert: true }
  )
}

/**
 * Get accountant email (from settings)
 */
export async function getAccountantEmail(userId: string): Promise<string | null> {
  return await getSetting('accountant_email', userId)
}

/**
 * Set accountant email (in settings)
 */
export async function setAccountantEmail(email: string, userId: string) {
  await setSetting('accountant_email', email, userId)
}

/**
 * Get invoice by ID with files
 * Optimized using MongoDB aggregation pipeline with $lookup for server-side joins
 */
export async function getInvoice(invoiceId: string, userId: string): Promise<Invoice | null> {
  const db = await getDatabase()
  
  // Use aggregation pipeline to join client and files server-side
  const result = await db.collection('invoices').aggregate([
    // Match invoice by ID and user_id
    {
      $match: { id: invoiceId, user_id: userId }
    },
    // Lookup client information
    {
      $lookup: {
        from: 'clients',
        localField: 'client_id',
        foreignField: 'id',
        as: 'client'
      }
    },
    // Unwind client array (should be single client)
    {
      $unwind: {
        path: '$client',
        preserveNullAndEmptyArrays: true
      }
    },
    // Lookup invoice files with sorting
    {
      $lookup: {
        from: 'invoice_files',
        let: { invoiceId: '$id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$invoice_id', '$$invoiceId'] }
            }
          },
          {
            $sort: { file_type: 1, uploaded_at: 1 }
          }
        ],
        as: 'files'
      }
    },
    // Project final structure
    {
      $project: {
        id: 1,
        client_id: 1,
        invoice_amount: 1,
        due_date: 1,
        month: 1,
        year: 1,
        notes: 1,
        uploaded_at: 1,
        sent_to_client: 1,
        sent_to_client_at: 1,
        payment_received: 1,
        payment_received_at: 1,
        sent_to_accountant: 1,
        sent_to_accountant_at: 1,
        client_name: { $ifNull: ['$client.name', ''] },
        client_email: { $ifNull: ['$client.email', ''] },
        requires_timesheet: { $ifNull: ['$client.requires_timesheet', false] },
        files: { $ifNull: ['$files', []] }
      }
    },
    // Limit to single result
    {
      $limit: 1
    }
  ]).toArray()
  
  if (result.length === 0) return null
  
  return result[0] as unknown as Invoice
}

/**
 * Get all invoices with client info and files
 * Optimized using MongoDB aggregation pipeline with $lookup for server-side joins
 */
export async function getAllInvoices(userId: string): Promise<Invoice[]> {
  const db = await getDatabase()
  
  // Use aggregation pipeline to join clients and files server-side
  const invoices = await db.collection('invoices').aggregate([
    // Match by user_id first
    {
      $match: { user_id: userId }
    },
    // Sort invoices first (can use index)
    {
      $sort: { year: -1, month: -1, uploaded_at: -1 }
    },
    // Lookup client information
    {
      $lookup: {
        from: 'clients',
        localField: 'client_id',
        foreignField: 'id',
        as: 'client'
      }
    },
    // Unwind client array (should be single client)
    {
      $unwind: {
        path: '$client',
        preserveNullAndEmptyArrays: true
      }
    },
    // Lookup invoice files with sorting
    {
      $lookup: {
        from: 'invoice_files',
        let: { invoiceId: '$id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$invoice_id', '$$invoiceId'] }
            }
          },
          {
            $sort: { file_type: 1, uploaded_at: 1 }
          }
        ],
        as: 'files'
      }
    },
    // Project final structure
    {
      $project: {
        id: 1,
        client_id: 1,
        invoice_amount: 1,
        due_date: 1,
        month: 1,
        year: 1,
        notes: 1,
        uploaded_at: 1,
        sent_to_client: 1,
        sent_to_client_at: 1,
        payment_received: 1,
        payment_received_at: 1,
        sent_to_accountant: 1,
        sent_to_accountant_at: 1,
        client_name: { $ifNull: ['$client.name', ''] },
        client_email: { $ifNull: ['$client.email', ''] },
        requires_timesheet: { $ifNull: ['$client.requires_timesheet', false] },
        files: { $ifNull: ['$files', []] }
      }
    }
  ]).toArray()
  
  return invoices as unknown as Invoice[]
}

/**
 * Create invoice with files
 */
export async function createInvoice(invoiceData: {
  clientId: string
  clientName?: string // Optional: if client doesn't exist, create with this name
  invoiceAmount: number
  month: number
  year: number
  files: Array<{
    fileKey: string
    fileType: 'invoice' | 'timesheet'
    originalName: string
    fileSize: number
  }>
}, userId: string) {
  const db = await getDatabase()
  const {
    clientId,
    clientName,
    invoiceAmount,
    month,
    year,
    files,
  } = invoiceData

  // Check if client exists, if not create it
  let finalClientId = clientId
  const existingClient = await db.collection('clients').findOne({ id: clientId, user_id: userId })
  
  if (!existingClient) {
    // Client doesn't exist, create it
    // Use provided clientName, or extract from clientId if it's in format __new__Name
    let newClientName = clientName
    if (!newClientName && clientId.startsWith('__new__')) {
      newClientName = clientId.replace('__new__', '')
    }
    // Fallback to clientId if no name available
    if (!newClientName) {
      newClientName = clientId
    }
    
    const newClientId = `client-${Date.now()}`
    
    await db.collection('clients').insertOne({
      id: newClientId,
      user_id: userId,
      name: newClientName,
      email: '', // Empty email as requested
      requires_timesheet: false,
      cc_emails: null,
      created_at: new Date(),
      updated_at: null,
    })
    
    finalClientId = newClientId
    console.log(`Created new client: ${newClientName} (${newClientId}) - Email missing, needs to be added`)
  }

  const invoiceId = `invoice-${Date.now()}`
  
  // Create invoice
  await db.collection('invoices').insertOne({
    id: invoiceId,
    user_id: userId,
    client_id: finalClientId,
    invoice_amount: invoiceAmount,
    due_date: null,
    month,
    year,
    notes: null,
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
      user_id: userId,
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
}, userId: string) {
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
    await db.collection('invoices').updateOne({ id: invoiceId, user_id: userId }, { $set: update })
  }
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
}, userId: string) {
  const db = await getDatabase()
  const {
    clientId,
    invoiceAmount,
    month,
    year,
    filesToDelete,
    newFiles,
  } = updates

  // Update invoice fields
  const update: Record<string, unknown> = {}
  if (clientId !== undefined) update.client_id = clientId
  if (invoiceAmount !== undefined) update.invoice_amount = invoiceAmount
  if (month !== undefined) update.month = month
  if (year !== undefined) update.year = year

  if (Object.keys(update).length > 0) {
    await db.collection('invoices').updateOne({ id: invoiceId, user_id: userId }, { $set: update })
  }

  // Delete files
  if (filesToDelete && filesToDelete.length > 0) {
    await db.collection('invoice_files').deleteMany({
      id: { $in: filesToDelete },
      invoice_id: invoiceId,
      user_id: userId,
    })
  }

  // Add new files
  if (newFiles && newFiles.length > 0) {
    const fileDocuments = newFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
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
export async function deleteInvoice(invoiceId: string, userId: string) {
  const db = await getDatabase()
  await db.collection('invoice_files').deleteMany({ invoice_id: invoiceId, user_id: userId })
  await db.collection('email_history').deleteMany({ invoice_id: invoiceId, user_id: userId })
  await db.collection('invoices').deleteOne({ id: invoiceId, user_id: userId })
}

/**
 * Get email templates
 */
export async function getEmailTemplates(userId: string) {
  const db = await getDatabase()
  const templates = await db.collection('email_templates')
    .find({ user_id: userId })
    .sort({ type: 1, created_at: 1 })
    .toArray()
  return templates as unknown as EmailTemplate[]
}

/**
 * Get email template by ID
 */
export async function getEmailTemplate(templateId: string, userId: string): Promise<EmailTemplate | null> {
  const db = await getDatabase()
  const template = await db.collection('email_templates').findOne({ id: templateId, user_id: userId })
  return (template as EmailTemplate | null) || null
}

/**
 * Create email template
 */
export async function createEmailTemplate(templateData: CreateEmailTemplateData, userId: string) {
  const db = await getDatabase()
  const id = `template-${Date.now()}`
  const { subject, body, type } = templateData
  
  await db.collection('email_templates').insertOne({
    id,
    user_id: userId,
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
export async function updateEmailTemplate(templateId: string, templateData: UpdateEmailTemplateData, userId: string) {
  const db = await getDatabase()
  const update: Record<string, unknown> = {
    updated_at: new Date(),
  }
  
  if (templateData.subject !== undefined) update.subject = templateData.subject
  if (templateData.body !== undefined) update.body = templateData.body
  if (templateData.type !== undefined) update.type = templateData.type
  
  await db.collection('email_templates').updateOne({ id: templateId, user_id: userId }, { $set: update })
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(templateId: string, userId: string) {
  const db = await getDatabase()
  await db.collection('email_templates').deleteOne({ id: templateId, user_id: userId })
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
}, userId: string) {
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
    user_id: userId,
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
export async function getEmailHistory(invoiceId: string, userId: string) {
  const db = await getDatabase()
  
  // Get email history
  const emails = await db.collection('email_history')
    .find({ invoice_id: invoiceId, user_id: userId })
    .sort({ sent_at: -1 })
    .toArray()
  
  // Get template names for lookup
  const templateIds = emails
    .map((e) => e.template_id)
    .filter((id): id is string => id !== null)
  
  const templates = templateIds.length > 0
    ? await db.collection('email_templates')
        .find({ id: { $in: templateIds }, user_id: userId })
        .toArray()
    : []
  
  const templateMap = new Map(templates.map((t) => [t.id, t]))
  
  // Combine emails with template names
  return emails.map((email) => ({
    ...email,
    template_name: email.template_id ? templateMap.get(email.template_id)?.subject : null,
  }))
}

/**
 * Get all email accounts for a user
 */
export async function getEmailAccounts(userId: string): Promise<EmailAccount[]> {
  const db = await getDatabase()
  const accounts = await db.collection('email_accounts')
    .find({ user_id: userId })
    .sort({ is_default: -1, created_at: 1 })
    .toArray()
  
  return accounts.map((account) => ({
    id: account.id,
    name: account.name || '',
    email: account.email || '',
    smtp_host: account.smtp_host || '',
    smtp_port: account.smtp_port || 587,
    smtp_user: account.smtp_user || '',
    smtp_pass: account.smtp_pass || '',
    is_default: account.is_default || false,
    created_at: account.created_at?.toISOString(),
    updated_at: account.updated_at?.toISOString(),
  })) as EmailAccount[]
}

/**
 * Get email account by ID
 */
export async function getEmailAccount(accountId: string, userId: string): Promise<EmailAccount | null> {
  const db = await getDatabase()
  const account = await db.collection('email_accounts').findOne({ id: accountId, user_id: userId })
  if (!account) return null
  
  return {
    id: account.id,
    name: account.name || '',
    email: account.email || '',
    smtp_host: account.smtp_host || '',
    smtp_port: account.smtp_port || 587,
    smtp_user: account.smtp_user || '',
    smtp_pass: account.smtp_pass || '',
    is_default: account.is_default || false,
    created_at: account.created_at?.toISOString(),
    updated_at: account.updated_at?.toISOString(),
  } as EmailAccount
}

/**
 * Get default email account for a user
 */
export async function getDefaultEmailAccount(userId: string): Promise<EmailAccount | null> {
  const db = await getDatabase()
  const account = await db.collection('email_accounts').findOne({ 
    user_id: userId, 
    is_default: true 
  })
  
  if (!account) return null
  
  return {
    id: account.id,
    name: account.name || '',
    email: account.email || '',
    smtp_host: account.smtp_host || '',
    smtp_port: account.smtp_port || 587,
    smtp_user: account.smtp_user || '',
    smtp_pass: account.smtp_pass || '',
    is_default: account.is_default || false,
    created_at: account.created_at?.toISOString(),
    updated_at: account.updated_at?.toISOString(),
  } as EmailAccount
}

/**
 * Create a new email account
 */
export async function createEmailAccount(data: CreateEmailAccountData, userId: string): Promise<string> {
  const db = await getDatabase()
  const id = `email-account-${Date.now()}`
  const { name, email, smtp_host, smtp_port, smtp_user, smtp_pass, is_default } = data
  
  // If this is set as default, unset all other defaults
  if (is_default) {
    await db.collection('email_accounts').updateMany(
      { user_id: userId, is_default: true },
      { $set: { is_default: false, updated_at: new Date() } }
    )
  }
  
  await db.collection('email_accounts').insertOne({
    id,
    user_id: userId,
    name,
    email,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_pass,
    is_default: is_default || false,
    created_at: new Date(),
    updated_at: null,
  })
  
  return id
}

/**
 * Update an email account
 */
export async function updateEmailAccount(accountId: string, data: UpdateEmailAccountData, userId: string) {
  const db = await getDatabase()
  const update: Record<string, unknown> = {
    updated_at: new Date(),
  }
  
  if (data.name !== undefined) update.name = data.name
  if (data.email !== undefined) update.email = data.email
  if (data.smtp_host !== undefined) update.smtp_host = data.smtp_host
  if (data.smtp_port !== undefined) update.smtp_port = data.smtp_port
  if (data.smtp_user !== undefined) update.smtp_user = data.smtp_user
  if (data.smtp_pass !== undefined) update.smtp_pass = data.smtp_pass
  
  // If setting as default, unset all other defaults
  if (data.is_default === true) {
    await db.collection('email_accounts').updateMany(
      { user_id: userId, is_default: true, id: { $ne: accountId } },
      { $set: { is_default: false, updated_at: new Date() } }
    )
    update.is_default = true
  } else if (data.is_default === false) {
    update.is_default = false
  }
  
  await db.collection('email_accounts').updateOne(
    { id: accountId, user_id: userId },
    { $set: update }
  )
}

/**
 * Delete an email account
 */
export async function deleteEmailAccount(accountId: string, userId: string) {
  const db = await getDatabase()
  await db.collection('email_accounts').deleteOne({ id: accountId, user_id: userId })
}
