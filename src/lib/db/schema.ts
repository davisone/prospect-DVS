import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const prospects = sqliteTable('prospects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  url: text('url'),
  city: text('city'),
  phone: text('phone'),
  source: text('source', { enum: ['csv', 'google_places'] }).notNull(),
  status: text('status', { enum: ['pending', 'analyzed', 'draft_ready', 'queued', 'sent'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id),
  httpsValid: integer('https_valid', { mode: 'boolean' }).notNull(),
  hasViewport: integer('has_viewport', { mode: 'boolean' }).notNull(),
  ttfbMs: integer('ttfb_ms').notNull(),
  technologies: text('technologies').notNull(), // JSON array
  obsoleteTech: text('obsolete_tech').notNull(), // JSON array
  designScore: integer('design_score'), // Score design/UX (0-100)
  designIssues: text('design_issues'), // JSON array of design issues
  designSummary: text('design_summary'), // Résumé de l'analyse design
  score: integer('score').notNull(),
  rawData: text('raw_data').notNull(), // JSON object
  analyzedAt: integer('analyzed_at', { mode: 'timestamp' }).notNull(),
});

export const emailDrafts = sqliteTable('email_drafts', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
});

export const emailQueue = sqliteTable('email_queue', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id),
  draftId: text('draft_id').notNull().references(() => emailDrafts.id),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  error: text('error'),
});

export const dailyLimits = sqliteTable('daily_limits', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  count: integer('count').notNull().default(0),
});

export type ProspectInsert = typeof prospects.$inferInsert;
export type ProspectSelect = typeof prospects.$inferSelect;
export type AnalysisInsert = typeof analyses.$inferInsert;
export type AnalysisSelect = typeof analyses.$inferSelect;
export type EmailDraftInsert = typeof emailDrafts.$inferInsert;
export type EmailDraftSelect = typeof emailDrafts.$inferSelect;
export type EmailQueueInsert = typeof emailQueue.$inferInsert;
export type EmailQueueSelect = typeof emailQueue.$inferSelect;
