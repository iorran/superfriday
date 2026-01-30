/**
 * Email Send API Route
 * Handles sending emails via SMTP
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceToClient, sendInvoiceToAccountant } from '@/lib/server/email'
import { updateInvoiceState, recordEmail, getInvoice, getAccountantEmail, getEmailTemplateByClient, getAccountantEmailTemplate, getClient, getSetting } from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'
import type { Invoice, InvoiceFile, EmailTemplate } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { invoiceId, recipientType, invoiceAmountEur } = body

    if (!invoiceId || !recipientType) {
      return NextResponse.json(
        { error: true, message: 'invoiceId and recipientType are required' },
        { status: 400 }
      )
    }

    // Get invoice with client info
    const invoice = await getInvoice(invoiceId, userId) as Invoice | null
    if (!invoice) {
      return NextResponse.json(
        { error: true, message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Validate client selection (critical security check)
    const clientId = invoice.client_id
    if (!clientId) {
      return NextResponse.json(
        { error: true, message: 'Invoice has no associated client' },
        { status: 400 }
      )
    }

    // Get template based on recipient type
    let template: EmailTemplate | null = null
    if (recipientType === 'client') {
      // For client emails, require template for the specific client
      template = await getEmailTemplateByClient(clientId, userId)
      if (!template) {
        return NextResponse.json(
          { error: true, message: `No email template found for client. Please create a template for this client before sending emails.` },
          { status: 400 }
        )
      }
    } else if (recipientType === 'accountant') {
      // For accountant emails, require accountant template - NO FALLBACK
      template = await getAccountantEmailTemplate(userId)
      if (!template) {
        return NextResponse.json(
          { error: true, message: `No email template found for accountant. Please create a template for the accountant before sending emails.` },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: true, message: 'Invalid recipientType. Must be "client" or "accountant"' },
        { status: 400 }
      )
    }

    // At this point, template is guaranteed to be non-null
    if (!template) {
      return NextResponse.json(
        { error: true, message: 'Template not found' },
        { status: 500 }
      )
    }

    // Get client data for template variables
    const client = await getClient(clientId, userId)

    // Replace template variables
    const replaceVariables = (text: string) => {
      if (!text) return ''

      // Format month name in English
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      const monthName = invoice.month ? monthNames[invoice.month - 1] || String(invoice.month) : ''
      const monthYear = invoice.month && invoice.year ? `${monthName} ${invoice.year}` : (invoice.year ? String(invoice.year) : '')

      // Format current date in Portuguese format (dd/mm/yyyy)
      const now = new Date()
      const currentDate = now.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })

      return text
        .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
        .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
        .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(invoice.invoice_amount) : '')
        .replace(/\{\{month\}\}/g, invoice.month ? String(invoice.month) : '')
        .replace(/\{\{year\}\}/g, invoice.year ? String(invoice.year) : '')
        .replace(/\{\{monthYear\}\}/g, monthYear)
        .replace(/\{\{downloadLink\}\}/g, '') // Not applicable for attachments
        .replace(/\{\{currentDate\}\}/g, currentDate)
        .replace(/\{\{clientVat\}\}/g, client?.vat || '')
        .replace(/\{\{clientAddress\}\}/g, client?.address || '')
    }

    // Use template subject and body, replacing variables
    const finalSubject = replaceVariables(template.subject || '')
    const finalBody = replaceVariables(template.body || '')

    let emailResult
    let recipientEmail: string
    let recipientName: string

    if (recipientType === 'client') {
      recipientEmail = invoice.client_email || ''
      recipientName = invoice.client_name || ''

      if (!recipientEmail) {
        return NextResponse.json(
          { error: true, message: 'Client email not found' },
          { status: 400 }
        )
      }

      // Get files for this invoice
      // Include invoice files always, and timesheet files only if client requires it
      const requiresTimesheet = invoice.requires_timesheet === true || invoice.requires_timesheet === 1
      const fileKeys = (invoice.files || [])
        .filter((f: InvoiceFile) => {
          // Always include invoice files
          if (f.file_type === 'invoice') return true
          // Include timesheet files only if client requires it
          if (f.file_type === 'timesheet') return requiresTimesheet
          return false
        })
        .map((f: InvoiceFile) => f.file_key)

      // Get CC emails from client (using client data already fetched above)
      let ccEmails: string[] = []
      if (client && client.cc_emails) {
        // MongoDB stores arrays directly, no need to parse JSON
        ccEmails = Array.isArray(client.cc_emails)
          ? client.cc_emails.filter((email: unknown) => {
              const emailStr = typeof email === 'string' ? email : String(email || '')
              return emailStr.trim().length > 0
            })
          : []
      }

      console.log('Sending email to client:', { 
        clientEmail: recipientEmail, 
        ccEmails, 
        subject: finalSubject,
        hasTemplate: !!template 
      })

      emailResult = await sendInvoiceToClient({
        invoiceId,
        clientEmail: recipientEmail,
        clientName: recipientName,
        subject: finalSubject,
        body: finalBody,
        fileKeys,
        ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
        userId,
      })

      // Update invoice state
      await updateInvoiceState(invoiceId, { sentToClient: true }, userId)
    } else if (recipientType === 'accountant') {
      // Check if invoice was sent to client first
      if (!invoice.sent_to_client) {
        return NextResponse.json(
          { error: true, message: 'Você deve enviar a invoice para o cliente antes de enviar para o contador.' },
          { status: 400 }
        )
      }

      const accountantEmailResult = await getAccountantEmail(userId)
      recipientEmail = accountantEmailResult || ''

      if (!recipientEmail) {
        return NextResponse.json(
          { error: true, message: 'Email do contador não configurado. Configure nas configurações.' },
          { status: 400 }
        )
      }

      recipientName = 'Accountant'

      // Get only invoice files (not timesheet)
      const invoiceFileKeys = (invoice.files || [])
        .filter((f: InvoiceFile) => f.file_type === 'invoice')
        .map((f: InvoiceFile) => f.file_key)

      if (invoiceFileKeys.length === 0) {
        return NextResponse.json(
          { error: true, message: 'No invoice files found' },
          { status: 400 }
        )
      }

      emailResult = await sendInvoiceToAccountant({
        invoiceId,
        accountantEmail: recipientEmail,
        clientName: invoice.client_name || '',
        subject: finalSubject,
        body: finalBody,
        fileKeys: invoiceFileKeys,
        userId,
      })

      // If client uses GBP, use manual EUR amount if provided, otherwise convert automatically
      // (using client data already fetched above)
      let finalInvoiceAmountEur = null
      if (client && client.currency === 'GBP' && invoice.invoice_amount) {
        // Use manually entered EUR amount if provided, otherwise calculate using conversion rate
        if (invoiceAmountEur !== undefined && invoiceAmountEur !== null) {
          finalInvoiceAmountEur = invoiceAmountEur
        } else {
          // Fallback to automatic conversion (for backwards compatibility)
          const gbpToEurRateStr = await getSetting('gbp_to_eur_rate', userId)
          const gbpToEurRate = gbpToEurRateStr ? parseFloat(gbpToEurRateStr) : 1.15
          finalInvoiceAmountEur = invoice.invoice_amount * gbpToEurRate
        }
      }

      // Update invoice state with EUR amount if converted
      await updateInvoiceState(invoiceId, { 
        sentToAccountant: true,
        invoiceAmountEur: finalInvoiceAmountEur,
      }, userId)
    } else {
      return NextResponse.json(
        { error: true, message: 'Invalid recipientType. Must be "client" or "accountant"' },
        { status: 400 }
      )
    }

    // Record email in history
    await recordEmail({
      invoiceId,
      templateId: template.id,
      recipientEmail,
      recipientName,
      recipientType: recipientType as 'client' | 'accountant',
      subject: finalSubject,
      body: finalBody,
      status: 'sent',
    }, userId)

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
    })
  } catch (error: unknown) {
    console.error('Email send error:', error)
    
    // Try to record failed email
    try {
      const session = await requireAuth()
      const userId = session.user.id
      const body = await request.json()
      await recordEmail({
        invoiceId: body.invoiceId,
        recipientEmail: '',
        recipientType: body.recipientType as 'client' | 'accountant',
        subject: body.subject || '',
        body: body.body || '',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }, userId)
    } catch {
      // Ignore record error
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: true, message: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}

