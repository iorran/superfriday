/**
 * Email Service
 * Handles creating Gmail compose URLs with template support
 */

/**
 * Create a Gmail compose URL
 * Opens Gmail compose window with pre-filled recipient, subject, and body
 */
export const createGmailComposeLink = (to, subject, body) => {
  const encodedTo = encodeURIComponent(to)
  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`
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

