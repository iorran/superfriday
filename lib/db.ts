/**
 * SQLite Database Client
 * Uses better-sqlite3 for database operations
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'database.db')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

export interface QueryResult {
  results: unknown[]
  changes?: number
  lastInsertRowid?: number | bigint
}

/**
 * Execute a SQL query
 */
export function executeQuery(sql: string, params: (string | number | boolean | null)[] = []): QueryResult {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return { results: stmt.all(...params) }
  } else {
    const result = stmt.run(...params)
    return { 
      results: [],
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    }
  }
}

/**
 * Initialize database with schema
 */
export function initDatabase() {
  const database = getDatabase()
  const schemaPath = path.join(process.cwd(), 'schema.sql')
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error('Schema file not found: schema.sql')
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  
  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))
  
  for (const statement of statements) {
    if (statement) {
      try {
        database.exec(statement)
      } catch (error: unknown) {
        // Ignore "already exists" errors
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes('already exists') && !errorMessage.includes('duplicate column')) {
          console.error('Error executing statement:', statement)
          console.error('Error:', errorMessage)
          // Don't throw, just log - allows re-running init
        }
      }
    }
  }
  
  console.log('Database initialized successfully')
}

