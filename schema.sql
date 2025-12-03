-- SQLite Database Schema for Invoice Management

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  requires_timesheet BOOLEAN DEFAULT 0,   -- INDRA precisa de timesheet, Cynergy não
  cc_emails TEXT,                         -- JSON array de emails CC: ["email1@example.com", "email2@example.com"]
  created_at DATETIME,
  updated_at DATETIME
);

-- Settings table (para configurações globais como email do contador)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME
);

-- Invoice files table (suporta múltiplos arquivos por invoice)
CREATE TABLE IF NOT EXISTS invoice_files (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,                -- Referência ao invoice principal
  file_key TEXT NOT NULL,                  -- Chave do arquivo no blob storage
  file_type TEXT NOT NULL,                 -- 'invoice' ou 'timesheet'
  original_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at DATETIME,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Invoices table (agora representa um conjunto de arquivos)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,                     -- ID único do invoice
  client_id TEXT NOT NULL,                 -- Referência ao cliente
  invoice_amount DECIMAL(10, 2),           -- Valor da invoice
  due_date DATE,                           -- Data de vencimento
  month INTEGER,                           -- Mês da invoice (1-12)
  year INTEGER,                            -- Ano da invoice
  notes TEXT,                              -- Notas adicionais
  uploaded_at DATETIME,
  
  -- Workflow States
  sent_to_client BOOLEAN DEFAULT 0,
  sent_to_client_at DATETIME,
  
  payment_received BOOLEAN DEFAULT 0,
  payment_received_at DATETIME,
  
  sent_to_accountant BOOLEAN DEFAULT 0,
  sent_to_accountant_at DATETIME,
  
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,                      -- 'to_client', 'to_account_manager'
  created_at DATETIME,
  updated_at DATETIME
);

-- Email history table
CREATE TABLE IF NOT EXISTS email_history (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,               -- Referência ao invoice
  template_id TEXT,                        -- Referência ao template
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT NOT NULL,            -- 'client' ou 'accountant'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at DATETIME,
  status TEXT,                             -- 'sent', 'failed', 'pending'
  error_message TEXT,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_to_client ON invoices(sent_to_client);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_received ON invoices(payment_received);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_to_accountant ON invoices(sent_to_accountant);
CREATE INDEX IF NOT EXISTS idx_invoices_month_year ON invoices(year, month);
CREATE INDEX IF NOT EXISTS idx_invoice_files_invoice_id ON invoice_files(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_history_invoice ON email_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('accountant_email', '', CURRENT_TIMESTAMP);
