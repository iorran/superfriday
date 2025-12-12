#!/usr/bin/env node
/**
 * Initialize MongoDB database with indexes
 * Uses mongodb driver
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { MongoClient } = require('mongodb')

const databaseUrl = process.env.MONGODB_URI || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Error: MONGODB_URI or DATABASE_URL environment variable is required')
  console.error('   Please set MONGODB_URI in your .env.local file')
  process.exit(1)
}

async function initDatabase() {
  let client
  try {
    client = new MongoClient(databaseUrl)
    await client.connect()
    
    const dbName = databaseUrl.split('/').pop()?.split('?')[0] || 'superfriday'
    const db = client.db(dbName)

    // Create indexes for better performance
    const clientsCollection = db.collection('clients')
    await clientsCollection.createIndex({ id: 1 }, { unique: true })
    await clientsCollection.createIndex({ user_id: 1 })
    await clientsCollection.createIndex({ name: 1 })
    await clientsCollection.createIndex({ email: 1 })

    const invoicesCollection = db.collection('invoices')
    await invoicesCollection.createIndex({ id: 1 }, { unique: true })
    await invoicesCollection.createIndex({ user_id: 1 })
    await invoicesCollection.createIndex({ client_id: 1 })
    await invoicesCollection.createIndex({ year: -1, month: -1 })
    await invoicesCollection.createIndex({ sent_to_client: 1 })
    await invoicesCollection.createIndex({ sent_to_accountant: 1 })
    await invoicesCollection.createIndex({ payment_received: 1 })

    const invoiceFilesCollection = db.collection('invoice_files')
    await invoiceFilesCollection.createIndex({ id: 1 }, { unique: true })
    await invoiceFilesCollection.createIndex({ user_id: 1 })
    await invoiceFilesCollection.createIndex({ invoice_id: 1 })
    await invoiceFilesCollection.createIndex({ file_key: 1 })

    const emailHistoryCollection = db.collection('email_history')
    await emailHistoryCollection.createIndex({ id: 1 }, { unique: true })
    await emailHistoryCollection.createIndex({ user_id: 1 })
    await emailHistoryCollection.createIndex({ invoice_id: 1 })
    await emailHistoryCollection.createIndex({ sent_at: -1 })

    const emailTemplatesCollection = db.collection('email_templates')
    await emailTemplatesCollection.createIndex({ id: 1 }, { unique: true })
    await emailTemplatesCollection.createIndex({ user_id: 1 })
    await emailTemplatesCollection.createIndex({ type: 1 })

    const emailAccountsCollection = db.collection('email_accounts')
    await emailAccountsCollection.createIndex({ id: 1 }, { unique: true })
    await emailAccountsCollection.createIndex({ user_id: 1 })
    await emailAccountsCollection.createIndex({ user_id: 1, is_default: 1 })

    const settingsCollection = db.collection('settings')
    await settingsCollection.createIndex({ user_id: 1, key: 1 }, { unique: true })

    // Insert default settings if they don't exist
    await settingsCollection.updateOne(
      { key: 'accountant_email' },
      { $setOnInsert: { key: 'accountant_email', value: '', updated_at: new Date() } },
      { upsert: true }
    )

    const userPreferencesCollection = db.collection('user_preferences')
    await userPreferencesCollection.createIndex({ user_id: 1 }, { unique: true })

    const googleOAuthTokensCollection = db.collection('google_oauth_tokens')
    await googleOAuthTokensCollection.createIndex({ user_id: 1 }, { unique: true })

    console.log('✅ Database initialized successfully!')
  } catch (error) {
    console.error('❌ Error initializing database:', error.message)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Run initialization
initDatabase()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
