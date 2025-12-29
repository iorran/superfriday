/**
 * Email Service
 * Handles sending emails via SMTP with support for multiple accounts
 */

import nodemailer from 'nodemailer'
import { getFile } from './storage'
import { getEmailAccount, getDefaultEmailAccount } from './db-operations'

// Cache for transporters (keyed by account ID or 'env' for env vars)
const transporterCache = new Map<string, nodemailer.Transporter>()

/**
 * Clear transporter cache for a specific account or all accounts
 * Call this when email account credentials are updated
 */
export const clearTransporterCache = (accountId?: string) => {
  if (accountId) {
    transporterCache.delete(`account-${accountId}`)
  } else {
    transporterCache.clear()
  }
}

/**
 * Check if an email is a Microsoft/Outlook account
 */
const isMicrosoftAccount = (email: string, smtpHost?: string): boolean => {
  const emailLower = email.toLowerCase()
  const hostLower = smtpHost?.toLowerCase() || ''
  
  return (
    emailLower.includes('@outlook.') ||
    emailLower.includes('@hotmail.') ||
    emailLower.includes('@live.') ||
    emailLower.includes('@msn.') ||
    hostLower.includes('outlook.') ||
    hostLower.includes('office365')
  )
}

/**
 * Check if an email is a Gmail account
 */
const isGmailAccount = (email: string, smtpHost?: string): boolean => {
  const emailLower = email.toLowerCase()
  const hostLower = smtpHost?.toLowerCase() || ''
  
  return (
    emailLower.includes('@gmail.') ||
    emailLower.includes('@googlemail.') ||
    hostLower.includes('gmail.') ||
    hostLower === 'smtp.gmail.com'
  )
}

/**
 * Create transporter configuration for an account
 */
const createTransporterConfig = (account: {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  email: string
  oauth2_client_id?: string
  oauth2_client_secret?: string
  oauth2_refresh_token?: string
  oauth2_access_token?: string
}) => {
  const isMicrosoft = isMicrosoftAccount(account.email, account.smtp_host)
  const isGmail = isGmailAccount(account.email, account.smtp_host)
  
  // For Microsoft accounts, use smtp.office365.com if not already set
  const host = isMicrosoft && !account.smtp_host.includes('office365') && !account.smtp_host.includes('outlook')
    ? 'smtp.office365.com'
    : account.smtp_host
  
  // For Gmail, ensure smtp.gmail.com is used
  const finalHost = isGmail && !host.includes('gmail.com')
    ? 'smtp.gmail.com'
    : host
  
  // For Microsoft and Gmail accounts on port 587, require TLS
  const port = account.smtp_port
  const secure = port === 465
  const requireTLS = (isMicrosoft || isGmail) && port === 587 && !secure
  
  // Configure authentication
  let auth: {
    type?: string
    user: string
    pass?: string
    clientId?: string
    clientSecret?: string
    refreshToken?: string
    accessToken?: string
  }
  
  // Use OAuth2 if credentials are provided
  if (account.oauth2_client_id && account.oauth2_client_secret && account.oauth2_refresh_token) {
    auth = {
      type: 'OAuth2',
      user: account.smtp_user,
      clientId: account.oauth2_client_id,
      clientSecret: account.oauth2_client_secret,
      refreshToken: account.oauth2_refresh_token,
      ...(account.oauth2_access_token ? { accessToken: account.oauth2_access_token } : {}),
    }
  } else {
    // Fall back to basic auth
    auth = {
      user: account.smtp_user,
      pass: account.smtp_pass,
    }
  }
  
  const config: Record<string, unknown> = {
    host: finalHost,
    port,
    secure,
    auth,
  }
  
  if (requireTLS) {
    config.requireTLS = true
  }
  
  // Gmail-specific configuration
  if (isGmail) {
    // Gmail requires TLS for port 587
    if (port === 587) {
      config.requireTLS = true
      config.secure = false
    }
    // Gmail on port 465 uses SSL
    if (port === 465) {
      config.secure = true
    }
  }
  
  return config
}

/**
 * Get transporter for a specific email account
 */
const getTransporterForAccount = async (accountId?: string, userId?: string): Promise<{
  transporter: nodemailer.Transporter
  fromEmail: string
}> => {
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
    
    const config = createTransporterConfig(account)
    const transporter = nodemailer.createTransport(config)
    
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
      
      const config = createTransporterConfig(defaultAccount)
      const transporter = nodemailer.createTransport(config)
      
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

  const envAccount = {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: parseInt(process.env.SMTP_PORT),
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS,
    email: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    oauth2_client_id: process.env.SMTP_OAUTH2_CLIENT_ID,
    oauth2_client_secret: process.env.SMTP_OAUTH2_CLIENT_SECRET,
    oauth2_refresh_token: process.env.SMTP_OAUTH2_REFRESH_TOKEN,
    oauth2_access_token: process.env.SMTP_OAUTH2_ACCESS_TOKEN,
  }
  
  const config = createTransporterConfig(envAccount)
  const transporter = nodemailer.createTransport(config)
  
  transporterCache.set(cacheKey, transporter)
  return {
    transporter,
    fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  }
}

/**
 * Send email with attachments
 */
const sendEmailWithAttachments = async (data: {
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
}) => {
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

  try {
    const info = await transporter.sendMail(mailOptions)
    return info
  } catch (error: unknown) {
    // Clear cache on authentication errors so user can retry with updated credentials
    if (error instanceof Error && (error.message.includes('EAUTH') || error.message.includes('535') || error.message.includes('BadCredentials') || error.message.includes('Authentication unsuccessful'))) {
      // Try to clear cache for the account if we have accountId
      // Note: We don't have accountId here, so we'll clear all caches on auth errors
      // This is safe as it will force recreation of transporters with fresh credentials
      transporterCache.clear()
    }
    
    // Provide helpful error messages for Microsoft accounts
    if (error instanceof Error && isMicrosoftAccount(fromEmail)) {
      if (error.message.includes('EAUTH') || error.message.includes('Authentication unsuccessful') || error.message.includes('basic authentication is disabled')) {
        throw new Error(`Microsoft/Outlook accounts require OAuth2 authentication. Basic authentication has been disabled by Microsoft. Please configure OAuth2 credentials (Client ID, Client Secret, and Refresh Token) in your email account settings. Original error: ${error.message}`)
      }
    }
    
    // Provide helpful error messages for Gmail accounts
    if (error instanceof Error && isGmailAccount(fromEmail)) {
      if (error.message.includes('535') || error.message.includes('BadCredentials') || error.message.includes('Username and Password not accepted') || error.message.includes('EAUTH')) {
        const detailedMessage = `Gmail authentication failed. Common issues:
1. App Password: If you have 2-Step Verification enabled, you MUST use an App Password (not your regular Gmail password). The App Password is a 16-character code without spaces.
2. Username: Make sure you're using your FULL Gmail address (e.g., yourname@gmail.com) as the SMTP username.
3. Settings: Verify your SMTP settings:
   - Host: smtp.gmail.com
   - Port: 587 (TLS) or 465 (SSL)
   - Username: your full Gmail address
   - Password: 16-character App Password (no spaces)

To create an App Password:
1. Go to https://myaccount.google.com/
2. Security → 2-Step Verification (enable if not already)
3. App Passwords → Generate new password for "Mail"
4. Copy the 16-character password (no spaces) and use it in SMTP settings

For more information: https://support.google.com/mail/answer/185833

Original error: ${error.message}`
        throw new Error(detailedMessage)
      }
    }
    
    throw error
  }
}

/**
 * Send invoice email to client
 */
export const sendInvoiceToClient = async (data: {
  invoiceId: string
  clientEmail: string
  clientName: string
  subject: string
  body: string
  fileKeys: string[] // Array of file keys to attach
  ccEmails?: string[] // Array of CC email addresses
  accountId?: string // Optional: specific email account to use
  userId?: string // Required if using accountId
}) => {
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
      
      // Extract filename from fileKey (format: path/to/filename.ext)
      // Get the last part after the last slash
      const fileKeyStr = String(fileKey || '')
      const filename = fileKeyStr.includes('/')
        ? fileKeyStr.substring(fileKeyStr.lastIndexOf('/') + 1)
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
export const sendInvoiceToAccountant = async (data: {
  invoiceId: string
  accountantEmail: string
  clientName: string
  subject: string
  body: string
  fileKeys: string[] // Only invoice files, not timesheet
  accountId?: string // Optional: specific email account to use
  userId?: string // Required if using accountId
}) => {
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
      
      // Extract filename from fileKey (format: path/to/filename.ext)
      // Get the last part after the last slash
      const fileKeyStr = String(fileKey || '')
      const filename = fileKeyStr.includes('/')
        ? fileKeyStr.substring(fileKeyStr.lastIndexOf('/') + 1)
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
export const verifySMTPConnection = async (accountId?: string, userId?: string) => {
  try {
    // Check if this is a Microsoft account without OAuth tokens before attempting verification
    if (accountId && userId) {
      const account = await getEmailAccount(accountId, userId)
      if (account && isMicrosoftAccount(account.email, account.smtp_host)) {
        // Microsoft accounts require OAuth2
        if (!account.oauth2_client_id || !account.oauth2_client_secret || !account.oauth2_refresh_token) {
          return {
            success: false,
            error: 'Microsoft/Outlook accounts require OAuth2 authentication. Please configure OAuth2 credentials (Client ID and Client Secret) and connect your Microsoft account before verifying.',
          }
        }
      }
    } else if (userId) {
      const defaultAccount = await getDefaultEmailAccount(userId)
      if (defaultAccount && isMicrosoftAccount(defaultAccount.email, defaultAccount.smtp_host)) {
        // Microsoft accounts require OAuth2
        if (!defaultAccount.oauth2_client_id || !defaultAccount.oauth2_client_secret || !defaultAccount.oauth2_refresh_token) {
          return {
            success: false,
            error: 'Microsoft/Outlook accounts require OAuth2 authentication. Please configure OAuth2 credentials (Client ID and Client Secret) and connect your Microsoft account before verifying.',
          }
        }
      }
    }

    const { transporter } = await getTransporterForAccount(accountId, userId)
    await transporter.verify()
    return { success: true }
  } catch (error: unknown) {
    let errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Get account info to check if it's Microsoft
    let accountEmail = ''
    try {
      if (accountId && userId) {
        const account = await getEmailAccount(accountId, userId)
        if (account) accountEmail = account.email
      } else if (userId) {
        const defaultAccount = await getDefaultEmailAccount(userId)
        if (defaultAccount) accountEmail = defaultAccount.email
      }
    } catch {
      // Ignore errors when fetching account info
    }
    
    // Provide helpful error messages for Microsoft accounts
    if (error instanceof Error && (isMicrosoftAccount(accountEmail) || isMicrosoftAccount(process.env.SMTP_USER || ''))) {
      if (errorMessage.includes('EAUTH') || errorMessage.includes('Authentication unsuccessful') || errorMessage.includes('basic authentication is disabled')) {
        errorMessage = `Microsoft/Outlook accounts require OAuth2 authentication. Basic authentication has been disabled by Microsoft. Please configure OAuth2 credentials (Client ID, Client Secret, and Refresh Token) in your email account settings. For more information, visit: https://support.microsoft.com/en-us/office/outlook-and-other-apps-are-unable-to-connect-to-outlook-com-when-using-basic-authentication-f4202ebf-89c6-4a8a-bec3-3d60cf7deaef`
      }
    }
    
    // Provide helpful error messages for Gmail accounts
    if (error instanceof Error && (isGmailAccount(accountEmail) || isGmailAccount(process.env.SMTP_USER || ''))) {
      if (errorMessage.includes('535') || errorMessage.includes('BadCredentials') || errorMessage.includes('Username and Password not accepted') || errorMessage.includes('EAUTH')) {
        errorMessage = `Gmail authentication failed. Common issues:
1. App Password: If you have 2-Step Verification enabled, you MUST use an App Password (not your regular Gmail password). The App Password is a 16-character code without spaces.
2. Username: Make sure you're using your FULL Gmail address (e.g., yourname@gmail.com) as the SMTP username.
3. Settings: Verify your SMTP settings:
   - Host: smtp.gmail.com
   - Port: 587 (TLS) or 465 (SSL)
   - Username: your full Gmail address
   - Password: 16-character App Password (no spaces)

To create an App Password:
1. Go to https://myaccount.google.com/
2. Security → 2-Step Verification (enable if not already)
3. App Passwords → Generate new password for "Mail"
4. Copy the 16-character password (no spaces) and use it in SMTP settings

For more information: https://support.google.com/mail/answer/185833`
      }
    }
    
    return { success: false, error: errorMessage }
  }
}



