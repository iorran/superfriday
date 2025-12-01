/**
 * D1 Database Client
 * Uses Cloudflare D1 HTTP API for database operations
 */

const getD1Config = () => ({
  accountId: import.meta.env.VITE_D1_ACCOUNT_ID || '',
  databaseId: import.meta.env.VITE_D1_DATABASE_ID || '',
  apiToken: import.meta.env.VITE_D1_API_TOKEN || '', // Optional, for production
})

/**
 * Execute a SQL query on D1
 * Uses Cloudflare Pages Functions API endpoint
 */
export const executeD1Query = async (sql, params = []) => {
  try {
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
      // If API endpoint doesn't exist (404) or fails, use mock
      if (response.status === 404 || response.status >= 500) {
        console.warn('D1 API endpoint not available, using localStorage mock')
        return executeD1QueryMock(sql, params)
      }
      const error = await response.json().catch(() => ({ message: 'D1 query failed' }))
      throw new Error(error.message || 'D1 query failed')
    }

    const result = await response.json()
    return result
  } catch (error) {
    // For local development, fall back to localStorage mock
    // Catch network errors, CORS errors, and any fetch failures
    if (
      error.message.includes('Failed to fetch') || 
      error.message.includes('NetworkError') ||
      error.message.includes('fetch') ||
      error.name === 'TypeError' ||
      error.name === 'NetworkError'
    ) {
      console.warn('D1 API not available, using localStorage mock:', error.message)
      return executeD1QueryMock(sql, params)
    }
    // If it's a different error from the mock, throw it
    throw error
  }
}

/**
 * Mock D1 for local development using localStorage
 */
const executeD1QueryMock = async (sql, params = []) => {
  try {
    const storageKey = 'd1_mock_data'
    let mockData = JSON.parse(localStorage.getItem(storageKey) || '{}')
    
    // Initialize mock data structure
    if (!mockData.clients) mockData.clients = []
    if (!mockData.invoices) mockData.invoices = []
    if (!mockData.email_templates) mockData.email_templates = []
    if (!mockData.email_history) mockData.email_history = []

    // Simple SQL parser for common operations
    const sqlLower = sql.toLowerCase().trim()
    
    // SELECT queries
    if (sqlLower.startsWith('select')) {
      if (sqlLower.includes('from clients')) {
        // Handle WHERE clause
        if (sqlLower.includes('where id = ?')) {
          const clientId = params[0]
          const client = mockData.clients.find(c => c.id === clientId)
          return { results: client ? [client] : [], success: true }
        }
        // Handle ORDER BY
        let clients = [...mockData.clients]
        if (sqlLower.includes('order by name')) {
          clients.sort((a, b) => a.name.localeCompare(b.name))
        }
        return { results: clients, success: true }
      }
      if (sqlLower.includes('from invoices')) {
        let invoices = [...mockData.invoices]
        // Join with clients if needed
        if (sqlLower.includes('join clients') || sqlLower.includes('left join clients')) {
          invoices = invoices.map(inv => {
            const client = mockData.clients.find(c => c.id === inv.client_id)
            return { ...inv, client_name: client?.name, client_email: client?.email }
          })
        }
        // Handle WHERE clause
        if (sqlLower.includes('where') && sqlLower.includes('file_key = ?')) {
          const fileKey = params[0]
          invoices = invoices.filter(inv => inv.file_key === fileKey)
        }
        // Handle ORDER BY
        if (sqlLower.includes('order by uploaded_at desc')) {
          invoices.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
        }
        return { results: invoices, success: true }
      }
      if (sqlLower.includes('from email_templates')) {
        let templates = [...mockData.email_templates]
        // Handle WHERE clause
        if (sqlLower.includes('where id = ?')) {
          const templateId = params[0]
          const template = templates.find(t => t.id === templateId)
          return { results: template ? [template] : [], success: true }
        }
        // Handle ORDER BY
        if (sqlLower.includes('order by name')) {
          templates.sort((a, b) => a.name.localeCompare(b.name))
        }
        return { results: templates, success: true }
      }
      if (sqlLower.includes('from email_history')) {
        let emails = [...mockData.email_history]
        // Handle WHERE clause
        if (sqlLower.includes('where invoice_file_key = ?')) {
          const invoiceKey = params[0]
          emails = emails.filter(e => e.invoice_file_key === invoiceKey)
        }
        // Handle ORDER BY
        if (sqlLower.includes('order by sent_at desc')) {
          emails.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
        }
        return { results: emails, success: true }
      }
    }
  
  // INSERT queries
  if (sqlLower.startsWith('insert')) {
    if (sqlLower.includes('into clients')) {
      const newClient = {
        id: params[0],
        name: params[1],
        email: params[2],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockData.clients.push(newClient)
      localStorage.setItem(storageKey, JSON.stringify(mockData))
      return { success: true, meta: { changes: 1 } }
    }
    if (sqlLower.includes('into invoices')) {
      const newInvoice = {
        file_key: params[0],
        client_id: params[1],
        original_name: params[2],
        file_size: params[3],
        invoice_amount: params[4],
        due_date: params[5],
        uploaded_at: new Date().toISOString(),
        sent_to_client: false,
        payment_received: false,
        sent_to_account_manager: false,
      }
      mockData.invoices.push(newInvoice)
      localStorage.setItem(storageKey, JSON.stringify(mockData))
      return { success: true, meta: { changes: 1 } }
    }
    if (sqlLower.includes('into email_templates')) {
      const newTemplate = {
        id: params[0],
        name: params[1],
        subject: params[2],
        body: params[3],
        type: params[4],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockData.email_templates.push(newTemplate)
      localStorage.setItem(storageKey, JSON.stringify(mockData))
      return { success: true, meta: { changes: 1 } }
    }
    if (sqlLower.includes('into email_history')) {
      const newEmail = {
        id: params[0],
        invoice_file_key: params[1],
        template_id: params[2],
        recipient_email: params[3],
        recipient_name: params[4],
        subject: params[5],
        body: params[6],
        status: params[7] || 'sent',
        error_message: params[8] || null,
        sent_at: new Date().toISOString(),
      }
      mockData.email_history.push(newEmail)
      localStorage.setItem(storageKey, JSON.stringify(mockData))
      return { success: true, meta: { changes: 1 } }
    }
  }
  
  // UPDATE queries
  if (sqlLower.startsWith('update')) {
    if (sqlLower.includes('invoices set')) {
      const fileKey = params[params.length - 1] // Last param is usually WHERE value
      const invoice = mockData.invoices.find(inv => inv.file_key === fileKey)
      if (invoice) {
        // Parse update fields from SQL and params
        const updates = sqlLower.match(/(\w+)\s*=\s*\?/g) || []
        updates.forEach((update, index) => {
          const field = update.split('=')[0].trim()
          const value = params[index]
          
          if (field === 'sent_to_client') {
            invoice.sent_to_client = value === 1 || value === true
            if (invoice.sent_to_client && !invoice.sent_to_client_at) {
              invoice.sent_to_client_at = new Date().toISOString()
            }
          } else if (field === 'payment_received') {
            invoice.payment_received = value === 1 || value === true
            if (invoice.payment_received && !invoice.payment_received_at) {
              invoice.payment_received_at = new Date().toISOString()
            }
          } else if (field === 'sent_to_account_manager') {
            invoice.sent_to_account_manager = value === 1 || value === true
            if (invoice.sent_to_account_manager && !invoice.sent_to_account_manager_at) {
              invoice.sent_to_account_manager_at = new Date().toISOString()
            }
          }
        })
        
        // Handle CURRENT_TIMESTAMP assignments
        if (sqlLower.includes('sent_to_client_at = current_timestamp')) {
          invoice.sent_to_client_at = new Date().toISOString()
        }
        if (sqlLower.includes('payment_received_at = current_timestamp')) {
          invoice.payment_received_at = new Date().toISOString()
        }
        if (sqlLower.includes('sent_to_account_manager_at = current_timestamp')) {
          invoice.sent_to_account_manager_at = new Date().toISOString()
        }
        
        localStorage.setItem(storageKey, JSON.stringify(mockData))
        return { success: true, meta: { changes: 1 } }
      }
      return { success: true, meta: { changes: 0 } }
    }
  }
  
  // DELETE queries
  if (sqlLower.startsWith('delete')) {
    if (sqlLower.includes('from invoices')) {
      const fileKey = params[0]
      mockData.invoices = mockData.invoices.filter(inv => inv.file_key !== fileKey)
      mockData.email_history = mockData.email_history.filter(e => e.invoice_file_key !== fileKey)
      localStorage.setItem(storageKey, JSON.stringify(mockData))
      return { success: true, meta: { changes: 1 } }
    }
    if (sqlLower.includes('from email_history')) {
      const invoiceKey = params[0]
      mockData.email_history = mockData.email_history.filter(e => e.invoice_file_key !== invoiceKey)
      localStorage.setItem(storageKey, JSON.stringify(mockData))
      return { success: true, meta: { changes: 1 } }
    }
  }
  
  return { results: [], success: true }
  } catch (error) {
    console.error('Error in D1 mock:', error)
    // Return empty result on error to prevent app crash
    return { results: [], success: false, error: error.message }
  }
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

