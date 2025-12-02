/**
 * Database Client (Client-side)
 * Makes API calls to Next.js API routes
 */

/**
 * Execute a SQL query via API
 */
async function executeQuery(sql: string, params: any[] = []) {
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
export async function getClients() {
  const result = await executeQuery('SELECT * FROM clients ORDER BY name')
  return result.results || []
}

/**
 * Get client by ID
 */
export async function getClient(clientId: string) {
  const result = await executeQuery('SELECT * FROM clients WHERE id = ?', [clientId])
  return result.results?.[0] || null
}

/**
 * Create a new client
 */
export async function createClient(name: string, email: string) {
  const id = `client-${Date.now()}`
  await executeQuery(
    'INSERT INTO clients (id, name, email) VALUES (?, ?, ?)',
    [id, name, email]
  )
  return id
}

/**
 * Update a client
 */
export async function updateClient(clientId: string, name: string, email: string) {
  await executeQuery(
    'UPDATE clients SET name = ?, email = ? WHERE id = ?',
    [name, email, clientId]
  )
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string) {
  await executeQuery('DELETE FROM clients WHERE id = ?', [clientId])
}

/**
 * Get invoice by file key
 */
export async function getInvoice(fileKey: string) {
  const result = await executeQuery(
    `SELECT i.*, c.name as client_name, c.email as client_email 
     FROM invoices i 
     LEFT JOIN clients c ON i.client_id = c.id 
     WHERE i.file_key = ?`,
    [fileKey]
  )
  return result.results?.[0] || null
}

/**
 * Get all invoices with client info
 */
export async function getAllInvoices() {
  const result = await executeQuery(
    `SELECT i.*, c.name as client_name, c.email as client_email 
     FROM invoices i 
     LEFT JOIN clients c ON i.client_id = c.id 
     ORDER BY i.uploaded_at DESC`
  )
  return result.results || []
}

/**
 * Create or update invoice
 */
export async function upsertInvoice(invoiceData: {
  fileKey: string
  clientId: string
  originalName: string
  fileSize: number
  invoiceAmount?: number | null
  dueDate?: string | null
}) {
  const {
    fileKey,
    clientId,
    originalName,
    fileSize,
    invoiceAmount,
    dueDate,
  } = invoiceData

  await executeQuery(
    `INSERT INTO invoices 
     (file_key, client_id, original_name, file_size, invoice_amount, due_date, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(file_key) DO UPDATE SET
       client_id = excluded.client_id,
       original_name = excluded.original_name,
       file_size = excluded.file_size,
       invoice_amount = excluded.invoice_amount,
       due_date = excluded.due_date`,
    [fileKey, clientId, originalName, fileSize, invoiceAmount, dueDate]
  )
}

/**
 * Update invoice state
 */
export async function updateInvoiceState(fileKey: string, updates: {
  sentToClient?: boolean
  sentToAccountManager?: boolean
}) {
  const {
    sentToClient,
    sentToAccountManager,
  } = updates

  const updatesList: string[] = []
  const params: any[] = []

  if (sentToClient !== undefined) {
    updatesList.push('sent_to_client = ?')
    params.push(sentToClient ? 1 : 0)
    if (sentToClient) {
      updatesList.push('sent_to_client_at = CURRENT_TIMESTAMP')
    }
  }

  if (sentToAccountManager !== undefined) {
    updatesList.push('sent_to_account_manager = ?')
    params.push(sentToAccountManager ? 1 : 0)
    if (sentToAccountManager) {
      updatesList.push('sent_to_account_manager_at = CURRENT_TIMESTAMP')
    }
  }

  if (updatesList.length === 0) return

  params.push(fileKey)
  const sql = `UPDATE invoices SET ${updatesList.join(', ')} WHERE file_key = ?`
  
  await executeQuery(sql, params)
}

/**
 * Delete invoice
 */
export async function deleteInvoice(fileKey: string) {
  await executeQuery('DELETE FROM invoices WHERE file_key = ?', [fileKey])
  await executeQuery('DELETE FROM email_history WHERE invoice_file_key = ?', [fileKey])
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
export async function getEmailTemplate(templateId: string) {
  const result = await executeQuery('SELECT * FROM email_templates WHERE id = ?', [templateId])
  return result.results?.[0] || null
}

/**
 * Create email template
 */
export async function createEmailTemplate(templateData: {
  name: string
  subject: string
  body: string
  type: string
}) {
  const id = `template-${Date.now()}`
  const { name, subject, body, type } = templateData
  await executeQuery(
    'INSERT INTO email_templates (id, name, subject, body, type) VALUES (?, ?, ?, ?, ?)',
    [id, name, subject, body, type]
  )
  return id
}

/**
 * Update email template
 */
export async function updateEmailTemplate(templateId: string, templateData: {
  name: string
  subject: string
  body: string
  type: string
}) {
  const { name, subject, body, type } = templateData
  await executeQuery(
    'UPDATE email_templates SET name = ?, subject = ?, body = ?, type = ? WHERE id = ?',
    [name, subject, body, type, templateId]
  )
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(templateId: string) {
  await executeQuery('DELETE FROM email_templates WHERE id = ?', [templateId])
}

/**
 * Record email in history
 */
export async function recordEmail(emailData: {
  invoiceFileKey: string
  templateId?: string | null
  recipientEmail: string
  recipientName?: string | null
  subject: string
  body: string
  status?: string
  errorMessage?: string | null
}) {
  const id = `email-${Date.now()}`
  const {
    invoiceFileKey,
    templateId,
    recipientEmail,
    recipientName,
    subject,
    body,
    status = 'sent',
    errorMessage,
  } = emailData

  await executeQuery(
    `INSERT INTO email_history 
     (id, invoice_file_key, template_id, recipient_email, recipient_name, subject, body, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, invoiceFileKey, templateId, recipientEmail, recipientName, subject, body, status, errorMessage]
  )
  
  return id
}

/**
 * Get email history for an invoice
 */
export async function getEmailHistory(invoiceFileKey: string) {
  const result = await executeQuery(
    `SELECT eh.*, et.name as template_name
     FROM email_history eh
     LEFT JOIN email_templates et ON eh.template_id = et.id
     WHERE eh.invoice_file_key = ?
     ORDER BY eh.sent_at DESC`,
    [invoiceFileKey]
  )
  return result.results || []
}

