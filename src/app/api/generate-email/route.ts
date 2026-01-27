import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prospects, analyses, emailDrafts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateEmail } from '@/lib/email/generator';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectId } = body as { prospectId: string };

    if (!prospectId) {
      return NextResponse.json(
        { error: 'Prospect ID required' },
        { status: 400 }
      );
    }

    // Get prospect with analysis
    const result = await db
      .select({
        prospect: prospects,
        analysis: analyses,
      })
      .from(prospects)
      .leftJoin(analyses, eq(prospects.id, analyses.prospectId))
      .where(eq(prospects.id, prospectId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    const analysis = result[0].analysis;
    const prospectWithAnalysis = {
      ...result[0].prospect,
      analysis: analysis ? {
        ...analysis,
        technologies: JSON.parse(analysis.technologies as string || '[]'),
        obsoleteTech: JSON.parse(analysis.obsoleteTech as string || '[]'),
        rawData: JSON.parse(analysis.rawData as string || '{}'),
      } : null,
    };

    // Generate email with OpenAI
    const email = await generateEmail(prospectWithAnalysis);

    // Check if draft already exists
    const existingDraft = await db
      .select()
      .from(emailDrafts)
      .where(eq(emailDrafts.prospectId, prospectId))
      .limit(1);

    let draftId: string;

    if (existingDraft[0]) {
      // Update existing
      draftId = existingDraft[0].id;
      await db
        .update(emailDrafts)
        .set({
          subject: email.subject,
          body: email.body,
          generatedAt: new Date(),
        })
        .where(eq(emailDrafts.id, draftId));
    } else {
      // Create new
      draftId = uuid();
      await db.insert(emailDrafts).values({
        id: draftId,
        prospectId,
        subject: email.subject,
        body: email.body,
        generatedAt: new Date(),
      });
    }

    // Update prospect status
    await db
      .update(prospects)
      .set({ status: 'draft_ready' })
      .where(eq(prospects.id, prospectId));

    return NextResponse.json({
      success: true,
      draft: {
        id: draftId,
        subject: email.subject,
        body: email.body,
      },
    });
  } catch (error) {
    console.error('Error generating email:', error);
    return NextResponse.json(
      { error: 'Failed to generate email' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { draftId, subject, body: emailBody } = body as {
      draftId: string;
      subject: string;
      body: string;
    };

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID required' },
        { status: 400 }
      );
    }

    await db
      .update(emailDrafts)
      .set({
        subject,
        body: emailBody,
      })
      .where(eq(emailDrafts.id, draftId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    );
  }
}
