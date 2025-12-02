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
 * Note: Some email clients have limits on mailto link length (~2000 chars)
 * If body is too long, it will be truncated
 */
export const createMailtoLink = (to, subject, body) => {
  const encodedSubject = encodeURIComponent(subject)
  
  // Truncate body if too long (mailto links have ~2000 char limit)
  // Keep some buffer for the rest of the URL
  const maxBodyLength = 1500
  const truncatedBody = body.length > maxBodyLength 
    ? body.substring(0, maxBodyLength) + '\n\n[... email body truncated ...]'
    : body
  
  const encodedBody = encodeURIComponent(truncatedBody)
  const link = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`
  
  // Log for debugging
  console.log('Mailto link created:', {
    to,
    subjectLength: subject.length,
    bodyLength: body.length,
    truncatedBodyLength: truncatedBody.length,
    linkLength: link.length,
  })
  
  return link
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

