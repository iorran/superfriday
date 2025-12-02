/**
 * Email Service
 * Handles creating mailto links with template support
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
 * Create a mailto link
 */
export const createMailtoLink = (to, subject, body) => {
  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`
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

