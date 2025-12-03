-- PostgreSQL Database Schema for Invoice Management

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  requires_timesheet BOOLEAN DEFAULT FALSE,   -- INDRA precisa de timesheet, Cynergy não
  cc_emails TEXT,                             -- JSON array de emails CC: ["email1@example.com", "email2@example.com"]
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Settings table (para configurações globais como email do contador)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP
);

-- Invoice files table (suporta múltiplos arquivos por invoice)
CREATE TABLE IF NOT EXISTS invoice_files (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL,                -- Referência ao invoice principal
  file_key VARCHAR(255) NOT NULL,                  -- Chave do arquivo no blob storage
  file_type VARCHAR(50) NOT NULL,                 -- 'invoice' ou 'timesheet'
  original_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Invoices table (agora representa um conjunto de arquivos)
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(255) PRIMARY KEY,                     -- ID único do invoice
  client_id VARCHAR(255) NOT NULL,                 -- Referência ao cliente
  invoice_amount DECIMAL(10, 2),                   -- Valor da invoice
  due_date DATE,                                   -- Data de vencimento
  month INTEGER,                                    -- Mês da invoice (1-12)
  year INTEGER,                                     -- Ano da invoice
  notes TEXT,                                      -- Notas adicionais
  uploaded_at TIMESTAMP,
  
  -- Workflow States
  sent_to_client BOOLEAN DEFAULT FALSE,
  sent_to_client_at TIMESTAMP,
  
  payment_received BOOLEAN DEFAULT FALSE,
  payment_received_at TIMESTAMP,
  
  sent_to_accountant BOOLEAN DEFAULT FALSE,
  sent_to_accountant_at TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR(255) PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,                      -- 'to_client', 'to_account_manager'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Email history table
CREATE TABLE IF NOT EXISTS email_history (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL,               -- Referência ao invoice
  template_id VARCHAR(255),                        -- Referência ao template
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_type VARCHAR(50) NOT NULL,            -- 'client' ou 'accountant'
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(50),                             -- 'sent', 'failed', 'pending'
  error_message TEXT,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
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
INSERT INTO settings (key, value, updated_at) 
VALUES ('accountant_email', '', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO NOTHING;
