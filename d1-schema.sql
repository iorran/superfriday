-- D1 Database Schema for Invoice Management

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  file_key TEXT PRIMARY KEY,           -- R2 file key (e.g., "1764586862873-invoice.pdf")
  client_id TEXT NOT NULL,             -- Reference to clients table
  original_name TEXT NOT NULL,         -- Original filename
  file_size INTEGER,                   -- File size in bytes
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Workflow States
  sent_to_client BOOLEAN DEFAULT FALSE,
  sent_to_client_at DATETIME,
  
  payment_received BOOLEAN DEFAULT FALSE,
  payment_received_at DATETIME,
  
  sent_to_account_manager BOOLEAN DEFAULT FALSE,
  sent_to_account_manager_at DATETIME,
  
  -- Additional fields
  invoice_amount DECIMAL(10, 2),      -- Invoice amount
  due_date DATE,                       -- Payment due date
  notes TEXT,                          -- Additional notes
  
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                  -- Template name (e.g., "Invoice to Client", "Payment Received")
  subject TEXT NOT NULL,                -- Email subject template
  body TEXT NOT NULL,                   -- Email body template (supports variables like {{clientName}}, {{invoiceName}})
  type TEXT NOT NULL,                   -- 'to_client', 'to_account_manager', etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email history table
CREATE TABLE IF NOT EXISTS email_history (
  id TEXT PRIMARY KEY,
  invoice_file_key TEXT NOT NULL,      -- Reference to invoices table
  template_id TEXT,                    -- Reference to email_templates table
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'sent',          -- 'sent', 'failed', 'pending'
  error_message TEXT,
  
  FOREIGN KEY (invoice_file_key) REFERENCES invoices(file_key),
  FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_to_client ON invoices(sent_to_client);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_received ON invoices(payment_received);
CREATE INDEX IF NOT EXISTS idx_invoices_uploaded_at ON invoices(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_email_history_invoice ON email_history(invoice_file_key);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at);

