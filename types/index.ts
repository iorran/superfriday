/**
 * Shared types for the application
 */

export interface Client {
  id: string
  name: string
  email: string
  requires_timesheet: boolean | number
  cc_emails?: string | null
  created_at?: string
  updated_at?: string
}

export interface Invoice {
  id: string
  client_id: string
  client_name?: string
  client_email?: string
  invoice_amount: number | null
  due_date: string | null
  month: number | null
  year: number | null
  uploaded_at: string
  lastModified: Date
  sent_to_client: boolean | number
  sent_to_client_at?: string | null
  payment_received: boolean | number
  payment_received_at?: string | null
  sent_to_accountant: boolean | number
  sent_to_accountant_at?: string | null
  files?: InvoiceFile[]
}

export interface InvoiceFile {
  id: string
  invoice_id: string
  file_key: string
  file_type: 'invoice' | 'timesheet'
  original_name: string
  file_size: number | null
  uploaded_at: string
}

export interface EmailTemplate {
  id: string
  subject: string
  body: string
  type: 'to_client' | 'to_account_manager'
  created_at?: string
  updated_at?: string
}

export interface WindowWithTemplateField extends Window {
  __currentTemplateField?: 'subject' | 'body'
}

export interface ExtractedPDFData {
  amount: number | null
  dueDate: string | null
  month: number | null
  year: number | null
  clientName: string | null // Client/vendor name extracted from PDF
  rawText: string
  confidence: 'high' | 'medium' | 'low'
}

export interface EmailAccount {
  id: string
  name: string
  email: string // The "from" email address
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string // Encrypted or plain (will be encrypted in production)
  // OAuth2 fields for Microsoft/Outlook (optional)
  oauth2_client_id?: string
  oauth2_client_secret?: string
  oauth2_refresh_token?: string
  oauth2_access_token?: string
  is_default?: boolean
  created_at?: string
  updated_at?: string
}

