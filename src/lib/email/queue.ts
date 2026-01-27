import { db } from '../db';
import { emailQueue, dailyLimits, prospects, emailDrafts } from '../db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { sendEmail } from './sender';
import { randomDelay } from '../utils';
import { v4 as uuid } from 'uuid';

const MAX_DAILY_EMAILS = 20;

// Allowed sending hours: 9h-11h
const SEND_HOURS = { start: 9, end: 11 };

// Allowed sending days: Tuesday (2), Wednesday (3), Thursday (4)
const SEND_DAYS = [2, 3, 4];

export async function getDailyCount(date: string): Promise<number> {
  const result = await db
    .select()
    .from(dailyLimits)
    .where(eq(dailyLimits.date, date))
    .limit(1);

  return result[0]?.count || 0;
}

export async function incrementDailyCount(date: string): Promise<void> {
  const existing = await db
    .select()
    .from(dailyLimits)
    .where(eq(dailyLimits.date, date))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(dailyLimits)
      .set({ count: existing[0].count + 1 })
      .where(eq(dailyLimits.date, date));
  } else {
    await db.insert(dailyLimits).values({ date, count: 1 });
  }
}

export async function canAddToQueue(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const dailyCount = await getDailyCount(today);
  return dailyCount < MAX_DAILY_EMAILS;
}

export async function getRemainingQuota(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const dailyCount = await getDailyCount(today);
  return MAX_DAILY_EMAILS - dailyCount;
}

export function getNextSendSlot(fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);

  // Find next valid day
  while (!SEND_DAYS.includes(date.getDay())) {
    date.setDate(date.getDate() + 1);
    date.setHours(SEND_HOURS.start, 0, 0, 0);
  }

  // Check if we're in the allowed time window
  const hours = date.getHours();
  if (hours < SEND_HOURS.start) {
    date.setHours(SEND_HOURS.start, 0, 0, 0);
  } else if (hours >= SEND_HOURS.end) {
    // Move to next valid day
    date.setDate(date.getDate() + 1);
    while (!SEND_DAYS.includes(date.getDay())) {
      date.setDate(date.getDate() + 1);
    }
    date.setHours(SEND_HOURS.start, 0, 0, 0);
  }

  // Add random delay (2-5 minutes)
  const randomMinutes = Math.floor(Math.random() * 4) + 2;
  date.setMinutes(date.getMinutes() + randomMinutes);

  return date;
}

export async function addToQueue(
  prospectId: string,
  draftId: string
): Promise<{ success: boolean; scheduledAt?: Date; error?: string }> {
  const canAdd = await canAddToQueue();

  if (!canAdd) {
    return {
      success: false,
      error: 'Limite quotidienne de 20 emails atteinte',
    };
  }

  // Get last scheduled email to determine next slot
  const lastScheduled = await db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.status, 'pending'))
    .orderBy(emailQueue.scheduledAt)
    .limit(1);

  let scheduledAt: Date;
  if (lastScheduled.length > 0) {
    // Schedule after the last pending email with random delay
    const lastTime = new Date(lastScheduled[0].scheduledAt);
    scheduledAt = getNextSendSlot(new Date(lastTime.getTime() + 5 * 60 * 1000));
  } else {
    scheduledAt = getNextSendSlot();
  }

  await db.insert(emailQueue).values({
    id: uuid(),
    prospectId,
    draftId,
    scheduledAt,
    status: 'pending',
  });

  // Update prospect status
  await db
    .update(prospects)
    .set({ status: 'queued' })
    .where(eq(prospects.id, prospectId));

  return { success: true, scheduledAt };
}

export async function processQueue(): Promise<{
  processed: number;
  success: number;
  failed: number;
}> {
  const now = new Date();
  const results = { processed: 0, success: 0, failed: 0 };

  // Get pending emails that are due
  const pendingEmails = await db
    .select({
      queue: emailQueue,
      prospect: prospects,
      draft: emailDrafts,
    })
    .from(emailQueue)
    .innerJoin(prospects, eq(emailQueue.prospectId, prospects.id))
    .innerJoin(emailDrafts, eq(emailQueue.draftId, emailDrafts.id))
    .where(
      and(
        eq(emailQueue.status, 'pending'),
        lte(emailQueue.scheduledAt, now)
      )
    );

  for (const item of pendingEmails) {
    results.processed++;

    // Check if prospect has email
    if (!item.prospect.email) {
      await db
        .update(emailQueue)
        .set({
          status: 'failed',
          error: 'Prospect sans adresse email',
        })
        .where(eq(emailQueue.id, item.queue.id));
      results.failed++;
      continue;
    }

    // Send email
    const sendResult = await sendEmail({
      to: item.prospect.email,
      subject: item.draft.subject,
      body: item.draft.body,
    });

    if (sendResult.success) {
      await db
        .update(emailQueue)
        .set({
          status: 'sent',
          sentAt: new Date(),
        })
        .where(eq(emailQueue.id, item.queue.id));

      await db
        .update(prospects)
        .set({ status: 'sent' })
        .where(eq(prospects.id, item.prospect.id));

      // Increment daily count
      const today = now.toISOString().split('T')[0];
      await incrementDailyCount(today);

      results.success++;
    } else {
      await db
        .update(emailQueue)
        .set({
          status: 'failed',
          error: sendResult.error,
        })
        .where(eq(emailQueue.id, item.queue.id));
      results.failed++;
    }

    // Random delay between sends (2-5 minutes)
    if (pendingEmails.indexOf(item) < pendingEmails.length - 1) {
      await randomDelay(2 * 60 * 1000, 5 * 60 * 1000);
    }
  }

  return results;
}

export async function getQueueStatus(): Promise<{
  pending: number;
  sent: number;
  failed: number;
  nextScheduled: Date | null;
  dailyRemaining: number;
}> {
  const pendingCount = await db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.status, 'pending'));

  const sentCount = await db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.status, 'sent'));

  const failedCount = await db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.status, 'failed'));

  const nextScheduled = await db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.status, 'pending'))
    .orderBy(emailQueue.scheduledAt)
    .limit(1);

  return {
    pending: pendingCount.length,
    sent: sentCount.length,
    failed: failedCount.length,
    nextScheduled: nextScheduled[0]?.scheduledAt ? new Date(nextScheduled[0].scheduledAt) : null,
    dailyRemaining: await getRemainingQuota(),
  };
}
