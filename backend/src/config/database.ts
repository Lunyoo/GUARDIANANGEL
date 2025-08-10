import Database from 'better-sqlite3'
import { join } from 'path'
import logger from './logger.js'

let db: Database.Database | null = null

export async function connectDatabase(): Promise<void> {
  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './database.db'
    db = new Database(dbPath)
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL')
    
    // Create tables
    createTables()
    
    logger.info(`Database connected: ${dbPath}`)
  return
  } catch (error) {
    logger.error('Database connection failed:', error)
    throw error
  }
}

function createTables() {
  if (!db) return
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nome TEXT NOT NULL,
      avatar_url TEXT,
      is_admin BOOLEAN DEFAULT FALSE,
      facebook_token TEXT,
      ad_account_id TEXT,
      ideogram_token TEXT,
      kiwify_client_id TEXT,
      kiwify_client_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Campaigns cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns_cache (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      data TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)
  
  // API Cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Automation logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)
  
  // Scraping results
  db.exec(`
    CREATE TABLE IF NOT EXISTS scraping_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      nicho TEXT NOT NULL,
      keywords TEXT NOT NULL,
      results TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)
  
  // Sales events (webhooks) with deduplication by event_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      source TEXT,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'received',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  logger.info('Database tables created/verified')
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not connected')
  }
  return db
}