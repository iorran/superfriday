/**
 * Email Service
 * Handles sending emails via SMTP with support for multiple accounts
 */

import nodemailer from 'nodemailer'
import { getFile } from './storage'
import { getEmailAccount, getDefaultEmailAccount } from './db-client'
import type { EmailAccount } from '@/types'

// Cache for transporters (keyed by account ID or 'env' for env vars)
const transporterCache = new Map<string, nodemailer.Transporter>()

/**
 * Get transporter for a specific email account
 */
async function getTransporterForAccount(accountId?: string, userId?: string): Promise<{
  transporter: nodemailer.Transporter
  fromEmail: string
}> {
  // If accountId provided, use that account
  if (accountId && userId) {
    const cacheKey = `account-${accountId}`
    
    if (transporterCache.has(cacheKey)) {
      const account = await getEmailAccount(accountId, userId)
      if (account) {
        return {
          transporter: transporterCache.get(cacheKey)!,
          fromEmail: account.email,
        }
      }
    }
    
    const account = await getEmailAccount(accountId, userId)
    if (!account) {
      throw new Error(`Email account ${accountId} not found`)
    }
    
    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      auth: {
        user: account.smtp_user,
        pass: account.smtp_pass,
      },
    })
    
    transporterCache.set(cacheKey, transporter)
    return {
      transporter,
      fromEmail: account.email,
    }
  }
  
  // Try to get default account if userId provided
  if (userId) {
    const defaultAccount = await getDefaultEmailAccount(userId)
    if (defaultAccount) {
      const cacheKey = `account-${defaultAccount.id}`
      
      if (transporterCache.has(cacheKey)) {
        return {
          transporter: transporterCache.get(cacheKey)!,
          fromEmail: defaultAccount.email,
        }
      }
      
      const transporter = nodemailer.createTransport({
        host: defaultAccount.smtp_host,
        port: defaultAccount.smtp_port,
        secure: defaultAccount.smtp_port === 465,
        auth: {
          user: defaultAccount.smtp_user,
          pass: defaultAccount.smtp_pass,
        },
      })
      
      transporterCache.set(cacheKey, transporter)
      return {
        transporter,
        fromEmail: defaultAccount.email,
      }
    }
  }
  
  // Fallback to environment variables
  const cacheKey = 'env'
  
  if (transporterCache.has(cacheKey)) {
    return {
      transporter: transporterCache.get(cacheKey)!,
      fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    }
  }
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables, or configure an email account in settings.')
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  
  transporterCache.set(cacheKey, transporter)
  return {
    transporter,
    fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  }
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
  accountId?: string // Optional: specific email account to use
  userId?: string // Required if using accountId
}) {
  const { to, cc, subject, html, attachments = [], accountId, userId } = data

  const { transporter, fromEmail } = await getTransporterForAccount(accountId, userId)

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
    from: fromEmail,
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
  accountId?: string // Optional: specific email account to use
  userId?: string // Required if using accountId
}) {
  const { clientEmail, subject, body, fileKeys, ccEmails, accountId, userId } = data

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
    accountId,
    userId,
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
  accountId?: string // Optional: specific email account to use
  userId?: string // Required if using accountId
}) {
  const { accountantEmail, subject, body, fileKeys, accountId, userId } = data

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
    accountId,
    userId,
  })
}

/**
 * Verify SMTP connection
 */
export async function verifySMTPConnection(accountId?: string, userId?: string) {
  try {
    const { transporter } = await getTransporterForAccount(accountId, userId)
    await transporter.verify()
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

