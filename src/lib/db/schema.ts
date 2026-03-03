import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const prospects = pgTable('prospects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  url: text('url'),
  city: text('city'),
  phone: text('phone'),
  departmentCode: text('department_code'),
  source: text('source', { enum: ['csv', 'google_places'] }).notNull(),
  status: text('status', { enum: ['pending', 'analyzed', 'draft_ready', 'queued', 'sent'] }).notNull().default('pending'),
  followUpStatus: text('follow_up_status', { enum: ['none', 'waiting', 'accepted', 'refused', 'no_response', 'not_prospectable'] }).default('none'),
  followUpNote: text('follow_up_note'),
  followUpAt: timestamp('follow_up_at'),
  createdAt: timestamp('created_at').notNull(),
});

export const analyses = pgTable('analyses', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id),
  httpsValid: boolean('https_valid').notNull(),
  hasViewport: boolean('has_viewport').notNull(),
  ttfbMs: integer('ttfb_ms').notNull(),
  technologies: jsonb('technologies').notNull(), // JSON array
  obsoleteTech: jsonb('obsolete_tech').notNull(), // JSON array
  designScore: integer('design_score'), // Score design/UX (0-100)
  designIssues: jsonb('design_issues'), // JSON array of design issues
  designSummary: text('design_summary'), // Résumé de l'analyse design
  score: integer('score').notNull(),
  rawData: jsonb('raw_data').notNull(), // JSON object
  analyzedAt: timestamp('analyzed_at').notNull(),
});

export const emailDrafts = pgTable('email_drafts', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  generatedAt: timestamp('generated_at').notNull(),
});

export const emailQueue = pgTable('email_queue', {
  id: text('id').primaryKey(),
  prospectId: text('prospect_id').notNull().references(() => prospects.id),
  draftId: text('draft_id').notNull().references(() => emailDrafts.id),
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  error: text('error'),
});

export const dailyLimits = pgTable('daily_limits', {
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