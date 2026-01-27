import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, 'smart-detection.db'));
export const db = drizzle(sqlite, { schema });

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS prospects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    url TEXT,
    city TEXT,
    phone TEXT,
    source TEXT NOT NULL CHECK(source IN ('csv', 'google_places')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'analyzed', 'draft_ready', 'queued', 'sent')),
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    prospect_id TEXT NOT NULL REFERENCES prospects(id),
    https_valid INTEGER NOT NULL,
    has_viewport INTEGER NOT NULL,
    ttfb_ms INTEGER NOT NULL,
    technologies TEXT NOT NULL,
    obsolete_tech TEXT NOT NULL,
    score INTEGER NOT NULL,
    raw_data TEXT NOT NULL,
    analyzed_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_drafts (
    id TEXT PRIMARY KEY,
    prospect_id TEXT NOT NULL REFERENCES prospects(id),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    generated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_queue (
    id TEXT PRIMARY KEY,
    prospect_id TEXT NOT NULL REFERENCES prospects(id),
    draft_id TEXT NOT NULL REFERENCES email_drafts(id),
    scheduled_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
    sent_at INTEGER,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS daily_limits (
    date TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  );
`);

export { schema };
