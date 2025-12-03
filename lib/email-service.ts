/**
 * Email Service
 * Handles sending emails via Gmail SMTP
 */

import nodemailer from 'nodemailer'
import { getFile } from './storage'

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.')
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

/**
 * Send email with attachments
 */
export async function sendEmailWithAttachments(data: {
  to: string
  cc?: string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer
    contentType?: string
  }>
}) {
  const { to, cc, subject, html, attachments = [] } = data

  const mailOptions: {
    from?: string
    to: string
    subject: string
    html: string
    attachments: Array<{
      filename: string
      path?: string
      content?: Buffer
      contentType?: string
    }>
    cc?: string | string[]
  } = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    attachments: attachments.map(att => ({
      filename: att.filename,
      ...(att.path ? { path: att.path } : {}),
      ...(att.content ? { content: att.content } : {}),
      ...(att.contentType ? { contentType: att.contentType } : {}),
    })),
  }

  // Add CC if provided
  // Nodemailer accepts CC as array or comma-separated string
  if (cc && cc.length > 0) {
    mailOptions.cc = Array.isArray(cc) ? cc : [cc]
  }

  const transporter = getTransporter()
  const info = await transporter.sendMail(mailOptions)
  
  return info
}

/**
 * Send invoice email to client
 */
export async function sendInvoiceToClient(data: {
  invoiceId: string
  clientEmail: string
  clientName: string
  subject: string
  body: string
  fileKeys: string[] // Array of file keys to attach
  ccEmails?: string[] // Array of CC email addresses
}) {
  const { clientEmail, subject, body, fileKeys, ccEmails } = data

  // Get files from blob storage
  const attachments = await Promise.all(
    fileKeys.map(async (fileKey) => {
      if (!fileKey) {
        throw new Error('File key is required')
      }
      const fileBuffer = await getFile(fileKey)
      if (!fileBuffer) {
        throw new Error(`File not found: ${fileKey}`)
      }
      
      // Extract filename from fileKey (format: timestamp-filename.ext)
      const fileKeyStr = String(fileKey || '')
      const filename = fileKeyStr.includes('-') 
        ? fileKeyStr.substring(fileKeyStr.indexOf('-') + 1)
        : fileKeyStr

      return {
        filename,
        content: fileBuffer,
        contentType: filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      }
    })
  )

  return await sendEmailWithAttachments({
    to: clientEmail,
    cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
    subject,
    html: body.replace(/\n/g, '<br>'),
    attachments,
  })
}

/**
 * Send invoice email to accountant
 */
export async function sendInvoiceToAccountant(data: {
  invoiceId: string
  accountantEmail: string
  clientName: string
  subject: string
  body: string
  fileKeys: string[] // Only invoice files, not timesheet
}) {
  const { accountantEmail, subject, body, fileKeys } = data

  // Get files from blob storage
  const attachments = await Promise.all(
    fileKeys.map(async (fileKey) => {
      if (!fileKey) {
        throw new Error('File key is required')
      }
      const fileBuffer = await getFile(fileKey)
      if (!fileBuffer) {
        throw new Error(`File not found: ${fileKey}`)
      }
      
      const fileKeyStr = String(fileKey || '')
      const filename = fileKeyStr.includes('-') 
        ? fileKeyStr.substring(fileKeyStr.indexOf('-') + 1)
        : fileKeyStr

      return {
        filename,
        content: fileBuffer,
        contentType: filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      }
    })
  )

  return await sendEmailWithAttachments({
    to: accountantEmail,
    subject,
    html: body.replace(/\n/g, '<br>'),
    attachments,
  })
}

/**
 * Verify SMTP connection
 */
export async function verifySMTPConnection() {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

