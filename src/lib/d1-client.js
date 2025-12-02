/**
 * D1 Database Client
 * Uses Cloudflare D1 HTTP API for database operations
 */

/**
 * Execute a SQL query on D1
 * Uses Cloudflare Pages Functions API endpoint
 */
export const executeD1Query = async (sql, params = []) => {
  // Use relative path - works in both local (via Vite proxy) and production (Pages Functions)
  // In local dev: Vite proxy forwards to Wrangler dev server (localhost:8787)
  // In production: Pages Functions handles /api/d1 automatically
  const apiUrl = '/api/d1'
  
  const response = await fetch(apiUrl, {
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
    const error = await response.json().catch(() => ({ message: 'D1 query failed' }))
    throw new Error(error.message || `D1 query failed with status ${response.status}`)
  }

  const result = await response.json()
  return result
}


/**
 * Get all clients
 */
export const getClients = async () => {
  const result = await executeD1Query('SELECT * FROM clients ORDER BY name')
  return result.results || []
}

/**
 * Get client by ID
 */
export const getClient = async (clientId) => {
  const result = await executeD1Query('SELECT * FROM clients WHERE id = ?', [clientId])
  return result.results?.[0] || null
}

/**
 * Create a new client
 */
export const createClient = async (name, email) => {
  const id = `client-${Date.now()}`
  await executeD1Query(
    'INSERT INTO clients (id, name, email) VALUES (?, ?, ?)',
    [id, name, email]
  )
  return id
}

/**
 * Update a client
 */
export const updateClient = async (clientId, name, email) => {
  await executeD1Query(
    'UPDATE clients SET name = ?, email = ? WHERE id = ?',
    [name, email, clientId]
  )
}

/**
 * Delete a client
 */
export const deleteClient = async (clientId) => {
  await executeD1Query('DELETE FROM clients WHERE id = ?', [clientId])
}

/**
 * Get invoice by file key
 */
export const getInvoice = async (fileKey) => {
  const result = await executeD1Query(
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
export const getAllInvoices = async () => {
  const result = await executeD1Query(
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
export const upsertInvoice = async (invoiceData) => {
  const {
    fileKey,
    clientId,
    originalName,
    fileSize,
    invoiceAmount,
    dueDate,
  } = invoiceData

  await executeD1Query(
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
export const updateInvoiceState = async (fileKey, updates) => {
  const {
    sentToClient,
    paymentReceived,
    sentToAccountManager,
  } = updates

  const updatesList = []
  const params = []

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
  
  await executeD1Query(sql, params)
}

/**
 * Delete invoice
 */
export const deleteInvoice = async (fileKey) => {
  await executeD1Query('DELETE FROM invoices WHERE file_key = ?', [fileKey])
  await executeD1Query('DELETE FROM email_history WHERE invoice_file_key = ?', [fileKey])
}

/**
 * Get email templates
 */
export const getEmailTemplates = async () => {
  const result = await executeD1Query('SELECT * FROM email_templates ORDER BY name')
  return result.results || []
}

/**
 * Get email template by ID
 */
export const getEmailTemplate = async (templateId) => {
  const result = await executeD1Query('SELECT * FROM email_templates WHERE id = ?', [templateId])
  return result.results?.[0] || null
}

/**
 * Create email template
 */
export const createEmailTemplate = async (templateData) => {
  const id = `template-${Date.now()}`
  const { name, subject, body, type } = templateData
  await executeD1Query(
    'INSERT INTO email_templates (id, name, subject, body, type) VALUES (?, ?, ?, ?, ?)',
    [id, name, subject, body, type]
  )
  return id
}

/**
 * Update email template
 */
export const updateEmailTemplate = async (templateId, templateData) => {
  const { name, subject, body, type } = templateData
  await executeD1Query(
    'UPDATE email_templates SET name = ?, subject = ?, body = ?, type = ? WHERE id = ?',
    [name, subject, body, type, templateId]
  )
}

/**
 * Delete email template
 */
export const deleteEmailTemplate = async (templateId) => {
  await executeD1Query('DELETE FROM email_templates WHERE id = ?', [templateId])
}

/**
 * Record email in history
 */
export const recordEmail = async (emailData) => {
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

  await executeD1Query(
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
export const getEmailHistory = async (invoiceFileKey) => {
  const result = await executeD1Query(
    `SELECT eh.*, et.name as template_name
     FROM email_history eh
     LEFT JOIN email_templates et ON eh.template_id = et.id
     WHERE eh.invoice_file_key = ?
     ORDER BY eh.sent_at DESC`,
    [invoiceFileKey]
  )
  return result.results || []
}

