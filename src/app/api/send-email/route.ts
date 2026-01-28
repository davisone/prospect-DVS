import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prospects, emailDrafts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/sender';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectId, draftId } = body as {
      prospectId: string;
      draftId: string;
    };

    if (!prospectId || !draftId) {
      return NextResponse.json(
        { error: 'Prospect ID and Draft ID required' },
        { status: 400 }
      );
    }

    // Get prospect and draft
    const prospect = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);

    const draft = await db
      .select()
      .from(emailDrafts)
      .where(eq(emailDrafts.id, draftId))
      .limit(1);

    if (!prospect[0] || !draft[0]) {
      return NextResponse.json(
        { error: 'Prospect or draft not found' },
        { status: 404 }
      );
    }

    if (!prospect[0].email) {
      return NextResponse.json(
        { error: 'Prospect has no email address' },
        { status: 400 }
      );
    }

    // Send email directly (bypasses queue)
    const result = await sendEmail({
      to: prospect[0].email,
      subject: draft[0].subject,
      body: draft[0].body,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update prospect status and set follow-up to "waiting"
    await db
      .update(prospects)
      .set({
        status: 'sent',
        followUpStatus: 'waiting',
        followUpAt: new Date(),
      })
      .where(eq(prospects.id, prospectId));

    return NextResponse.json({
      success: true,
      emailId: result.id,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
