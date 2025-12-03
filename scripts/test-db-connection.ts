/**
 * Test MongoDB Connection
 * Simple script to verify MongoDB connection is working
 */

import 'dotenv/config'
import { getDatabase } from '../lib/db'

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...\n')
    
    const db = await getDatabase()
    console.log('✅ Connected to database:', db.databaseName)
    
    // Test a simple query
    const collections = await db.listCollections().toArray()
    console.log(`✅ Found ${collections.length} collections:`)
    collections.forEach((col) => {
      console.log(`   - ${col.name}`)
    })
    
    // Test reading from a collection (won't fail if empty)
    const clientsCount = await db.collection('clients').countDocuments()
    console.log(`\n✅ Clients collection: ${clientsCount} documents`)
    
    console.log('\n✅ Connection test successful!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Connection test failed:')
    console.error(error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.message.includes('MONGODB_URI')) {
      console.error('\n💡 Make sure you have MONGODB_URI or DATABASE_URL set in your .env.local file')
    }
    
    process.exit(1)
  }
}

testConnection()

