import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
import { join } from 'path'
import logger from './logger.js'

let db: any | null = null

export async function connectDatabase(): Promise<void> {
  try {
    // Usar o mesmo banco do Prisma
    const dbPath = './prisma/neural_system.db'
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

  // Leads core (used by ML + queue) – kept minimal to avoid conflict with Prisma layer
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      first_contact DATETIME,
      last_contact DATETIME,
      city TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
  `)

  // Conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      stage TEXT DEFAULT 'initial',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
  `)

  // Migração: Adicionar coluna updated_at se não existir
  try {
    db.exec(`ALTER TABLE conversations ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`)
  } catch (e) {
    // Coluna já existe, ignorar erro
  }

  // Messages (lightweight logging for ML feature extraction)
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      conversation_id TEXT,
      direction TEXT, -- inbound | outbound
      type TEXT,      -- text | media
      content TEXT,
      media_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);
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

  // COD configuration (selected cities for Cash on Delivery)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cod_config (
      id INTEGER PRIMARY KEY,
      cities TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Sales events (webhooks) with deduplication by event_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      source TEXT,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'received',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migração: Adicionar coluna updated_at se não existir nas sales_events
  try {
    db.exec(`ALTER TABLE sales_events ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`)
  } catch (e) {
    // Coluna já existe, ignorar erro
  }

  // Outbound message queue (persisted)
  db.exec(`
    CREATE TABLE IF NOT EXISTS outbound_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      content TEXT NOT NULL,
      msg_type TEXT NOT NULL DEFAULT 'text',
      meta TEXT,
      schedule_at INTEGER NOT NULL,
      sent INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      sent_at INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Rewards / interaction outcomes for bandits & latency tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT,
      phone TEXT,
      variant TEXT,
      out_at DATETIME,
      in_at DATETIME,
      reply_latency_sec INTEGER,
      impression INTEGER DEFAULT 0,
      interaction INTEGER DEFAULT 0,
      created_order INTEGER DEFAULT 0,
      delivered INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_rewards_variant ON rewards(variant);
    CREATE INDEX IF NOT EXISTS idx_rewards_phone ON rewards(phone);
  `)

  // Anomalies persistence
  db.exec(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      severity TEXT NOT NULL,
      mean REAL,
      std REAL,
      z REAL,
      note TEXT,
      ts INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_anomalies_metric_ts ON anomalies(metric, ts);
  `)

  // Delivery events (final confirmation of delivered orders via admin bot)
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      order_code TEXT,
      revenue REAL,
      confirmed_by TEXT,
      confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_delivery_phone ON delivery_events(phone);
  `)

  // Admin order notifications (durable idempotency per day and phone)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_order_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      conversation_id TEXT,
      day_key TEXT NOT NULL,
      info TEXT,
      notified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(phone, day_key)
    );
    CREATE INDEX IF NOT EXISTS idx_admin_notify_day ON admin_order_notifications(day_key);
    CREATE INDEX IF NOT EXISTS idx_admin_notify_phone ON admin_order_notifications(phone);
  `)

  // Lightweight conversation state cache (by phone)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_states (
      phone TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  logger.info('Database tables created/verified')
}

/**
 * Returns the active database instance. If the database was not yet connected and
 * the environment explicitly allows an in-memory fallback (for lightweight tests)
 * it will auto-initialize an ephemeral ':memory:' database and create the tables.
 *
 * Enable by setting one of:
 *  - BOT_DB_INMEMORY=1
 *  - NODE_ENV=test
 *  - AUTO_DB=1
 *
 * In production we deliberately DO NOT auto-init to avoid accidental data loss.
 */
export function getDatabase(): any {
  if (!db) {
    const allowFallback = (
      process.env.BOT_DB_INMEMORY === '1' ||
      process.env.AUTO_DB === '1' ||
      process.env.NODE_ENV === 'test'
    )
    if (allowFallback) {
      try {
        db = new Database(':memory:')
        createTables()
        logger.warn('Auto-initialized in-memory SQLite database (fallback mode)')
      } catch (e) {
        throw new Error('Database not connected and in-memory fallback failed: ' + (e as any)?.message)
      }
    } else {
      throw new Error('Database not connected')
    }
  }
  return db
}