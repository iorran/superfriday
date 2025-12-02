/**
 * Email Service
 * Handles sending emails with template support
 */

/**
 * Replace template variables in text
 */
export const replaceTemplateVariables = (template, variables) => {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  })
  return result
}

/**
 * Send email using the API endpoint
 */
export const sendEmail = async (to, subject, body, html = null) => {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      body,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send email' }))
    throw new Error(error.message || `Email send failed with status ${response.status}`)
  }

  return await response.json()
}

/**
 * Send email using a template
 */
export const sendEmailWithTemplate = async (template, variables, recipient) => {
  const subject = replaceTemplateVariables(template.subject, variables)
  const body = replaceTemplateVariables(template.body, variables)
  const html = template.html 
    ? replaceTemplateVariables(template.html, variables)
    : body.replace(/\n/g, '<br>')

  return await sendEmail(recipient.email, subject, body, html)
}

/**
 * Get template variables from invoice data
 */
export const getTemplateVariables = (invoice, client) => {
  return {
    clientName: client?.name || 'Client',
    invoiceName: invoice?.original_name || 'Invoice',
    invoiceAmount: invoice?.invoice_amount 
      ? `$${parseFloat(invoice.invoice_amount).toFixed(2)}`
      : 'N/A',
    dueDate: invoice?.due_date 
      ? new Date(invoice.due_date).toLocaleDateString()
      : 'N/A',
    uploadDate: invoice?.uploaded_at
      ? new Date(invoice.uploaded_at).toLocaleDateString()
      : 'N/A',
  }
}

