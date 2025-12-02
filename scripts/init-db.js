#!/usr/bin/env node
/**
 * Initialize SQLite database with schema
 */

const path = require('path')
const Database = require('better-sqlite3')
const fs = require('fs')

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'database.db')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const schemaPath = path.join(process.cwd(), 'schema.sql')

if (!fs.existsSync(schemaPath)) {
  console.error('❌ Schema file not found: schema.sql')
  process.exit(1)
}

const schema = fs.readFileSync(schemaPath, 'utf-8')

// Execute the entire schema at once
// This ensures tables are created before indexes
try {
  db.exec(schema)
  console.log('✅ Database initialized successfully!')
} catch (error) {
  // Check if tables already exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  if (tables.length > 0) {
    console.log('⚠️  Database already contains tables. Skipping initialization.')
    console.log('   If you want to reinitialize, delete the database file first.')
  } else {
    console.error('❌ Error initializing database:', error.message)
    process.exit(1)
  }
}

db.close()
