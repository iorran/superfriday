/**
 * Email Send API Route
 * Handles sending emails via SMTP
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceToClient, sendInvoiceToAccountant } from '@/lib/email-service'
import { updateInvoiceState, recordEmail, getInvoice, getAccountantEmail, getEmailTemplate } from '@/lib/db-client'
import { executeQuery } from '@/lib/db'
import type { Invoice, InvoiceFile } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, recipientType, templateId, subject, body: emailBody } = body

    if (!invoiceId || !recipientType) {
      return NextResponse.json(
        { error: true, message: 'invoiceId and recipientType are required' },
        { status: 400 }
      )
    }

    // Get invoice with client info
    const invoice = await getInvoice(invoiceId) as Invoice | null
    if (!invoice) {
      return NextResponse.json(
        { error: true, message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Validate client selection (critical security check)
    if (recipientType === 'client') {
      // Double-check we're sending to the correct client
      const clientId = invoice.client_id
      if (!clientId) {
        return NextResponse.json(
          { error: true, message: 'Invoice has no associated client' },
          { status: 400 }
        )
      }
    }

    // Process template: if templateId provided, use template; otherwise use subject/body from request
    let finalSubject = subject
    let finalBody = emailBody
    
    if (templateId) {
      const template = await getEmailTemplate(templateId)
      if (template) {
        console.log('Using template:', { templateId, templateSubject: template.subject, templateBody: template.body?.substring(0, 50) })
        
        // Replace template variables
        const replaceVariables = (text: string) => {
          if (!text) return ''
          return text
            .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
            .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
            .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(invoice.invoice_amount) : '')
            .replace(/\{\{dueDate\}\}/g, invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('pt-PT') : '')
            .replace(/\{\{downloadLink\}\}/g, '') // Not applicable for attachments
        }
        
        // Use template subject and body, replacing variables (override frontend values)
        finalSubject = replaceVariables(template.subject) || subject
        finalBody = replaceVariables(template.body) || emailBody
        
        console.log('After template processing:', { finalSubject, finalBody: finalBody?.substring(0, 50) })
      } else {
        console.warn('Template not found:', templateId)
      }
    } else {
      console.log('No templateId, using subject/body from request:', { subject, body: emailBody?.substring(0, 50) })
    }

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

      // Get all files for this invoice
      const fileKeys = (invoice.files || []).map((f: InvoiceFile) => f.file_key)

      // Get CC emails from client
      let ccEmails: string[] = []
      if (invoice.client_id) {
        const clientResult = executeQuery('SELECT cc_emails FROM clients WHERE id = ?', [invoice.client_id])
        const client = clientResult.results?.[0] as { cc_emails?: string } | undefined
        if (client && client.cc_emails) {
          try {
            const parsed = JSON.parse(client.cc_emails)
            ccEmails = Array.isArray(parsed) ? parsed.filter((email: string) => email && email.trim()) : []
          } catch (e) {
            console.error('Error parsing CC emails:', e)
            // Ignore parse errors
          }
        }
      }

      console.log('Sending email to client:', { 
        clientEmail: recipientEmail, 
        ccEmails, 
        subject: finalSubject,
        hasTemplate: !!templateId 
      })

      emailResult = await sendInvoiceToClient({
        invoiceId,
        clientEmail: recipientEmail,
        clientName: recipientName,
        subject: finalSubject || `Invoice - ${invoice.client_name}`,
        body: finalBody || `Please find attached invoice.`,
        fileKeys,
        ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
      })

      // Update invoice state
      await updateInvoiceState(invoiceId, { sentToClient: true })
    } else if (recipientType === 'accountant') {
      const accountantEmailResult = await getAccountantEmail()
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
        subject: finalSubject || `Invoice for ${invoice.client_name || ''}`,
        body: finalBody || `Please find attached invoice for ${invoice.client_name || ''}.`,
        fileKeys: invoiceFileKeys,
      })

      // Update invoice state
      await updateInvoiceState(invoiceId, { sentToAccountant: true })
    } else {
      return NextResponse.json(
        { error: true, message: 'Invalid recipientType. Must be "client" or "accountant"' },
        { status: 400 }
      )
    }

    // Record email in history
    await recordEmail({
      invoiceId,
      templateId: templateId || null,
      recipientEmail,
      recipientName,
      recipientType: recipientType as 'client' | 'accountant',
      subject: finalSubject || 'Invoice',
      body: finalBody || '',
      status: 'sent',
    })

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
    })
  } catch (error: unknown) {
    console.error('Email send error:', error)
    
    // Try to record failed email
    try {
      const body = await request.json()
      await recordEmail({
        invoiceId: body.invoiceId,
        recipientEmail: '',
        recipientType: body.recipientType as 'client' | 'accountant',
        subject: body.subject || '',
        body: body.body || '',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch {
      // Ignore record error
    }

    return NextResponse.json(
      { error: true, message: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}

