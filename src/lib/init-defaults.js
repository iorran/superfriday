/**
 * Initialize default data for the application
 * Run this once to set up default clients and email templates
 */

import { createClient, createEmailTemplate } from './d1-client'

export const initializeDefaults = async () => {
  try {
    // Check if defaults already exist
    const { getClients, getEmailTemplates } = await import('./d1-client')
    const existingClients = await getClients()
    const existingTemplates = await getEmailTemplates()

    // Create default clients if none exist
    if (existingClients.length === 0) {
      console.log('Creating default clients...')
      await createClient('Client 1', 'client1@example.com')
      await createClient('Client 2', 'client2@example.com')
      console.log('Default clients created')
    }

    // Create default email templates if none exist
    if (existingTemplates.length === 0) {
      console.log('Creating default email templates...')
      
      await createEmailTemplate({
        name: 'Invoice to Client',
        subject: 'Invoice {{invoiceName}} - Payment Due',
        body: `Dear {{clientName}},

Please find attached invoice {{invoiceName}}.

Amount: {{invoiceAmount}}
Due Date: {{dueDate}}

Thank you for your business!

Best regards`,
        type: 'to_client',
      })

      await createEmailTemplate({
        name: 'Payment Received - To Account Manager',
        subject: 'Payment Received for Invoice {{invoiceName}}',
        body: `Hi,

Payment has been received for invoice {{invoiceName}} from {{clientName}}.

Amount: {{invoiceAmount}}
Received Date: ${new Date().toLocaleDateString()}

Please proceed with your obligations.

Thank you!`,
        type: 'to_account_manager',
      })

      console.log('Default email templates created')
    }

    console.log('Initialization complete!')
  } catch (error) {
    console.error('Error initializing defaults:', error)
    throw error
  }
}

