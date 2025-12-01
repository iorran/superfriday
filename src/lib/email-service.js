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
 * Send email using the API
 */
export const sendEmail = async (to, subject, body, html = null) => {
  try {
    // For local development, we'll use Resend API directly
    // In production, use the Cloudflare Pages Function
    const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Try using the API endpoint first (for production)
    try {
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

      if (response.ok) {
        return await response.json()
      }
    } catch (apiError) {
      console.warn('API endpoint not available, using direct Resend API')
    }

    // Fallback to direct Resend API (for local development)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || body.replace(/\n/g, '<br>'),
        text: body,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send email')
    }

    return await response.json()
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
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

