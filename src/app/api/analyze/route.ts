import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prospects, analyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { analyzeWebsite, calculateObsoleteScore } from '@/lib/analysis/analyzer';
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

    // Get prospect
    const prospect = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);

    if (!prospect[0]) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    if (!prospect[0].url) {
      return NextResponse.json(
        { error: 'Prospect has no URL to analyze' },
        { status: 400 }
      );
    }

    // Run analysis (with email extraction)
    const result = await analyzeWebsite(prospect[0].url, { extractEmail: true });
    const score = calculateObsoleteScore(result);

    // Si le prospect n'a pas d'email et qu'on en a trouvé un, le mettre à jour
    if (!prospect[0].email && result.emailExtraction?.bestEmail) {
      await db
        .update(prospects)
        .set({ email: result.emailExtraction.bestEmail })
        .where(eq(prospects.id, prospectId));
    }

    // Check if analysis already exists
    const existingAnalysis = await db
      .select()
      .from(analyses)
      .where(eq(analyses.prospectId, prospectId))
      .limit(1);

    if (existingAnalysis[0]) {
      // Update existing
      await db
        .update(analyses)
        .set({
          httpsValid: result.httpsValid,
          hasViewport: result.hasViewport,
          ttfbMs: result.ttfbMs,
          technologies: JSON.stringify(result.technologies),
          obsoleteTech: JSON.stringify(result.obsoleteTech),
          score,
          rawData: JSON.stringify(result.rawData),
          analyzedAt: new Date(),
        })
        .where(eq(analyses.id, existingAnalysis[0].id));
    } else {
      // Create new
      await db.insert(analyses).values({
        id: uuid(),
        prospectId,
        httpsValid: result.httpsValid,
        hasViewport: result.hasViewport,
        ttfbMs: result.ttfbMs,
        technologies: JSON.stringify(result.technologies),
        obsoleteTech: JSON.stringify(result.obsoleteTech),
        score,
        rawData: JSON.stringify(result.rawData),
        analyzedAt: new Date(),
      });
    }

    // Update prospect status
    await db
      .update(prospects)
      .set({ status: 'analyzed' })
      .where(eq(prospects.id, prospectId));

    return NextResponse.json({
      success: true,
      analysis: {
        ...result,
        score,
      },
      emailExtracted: result.emailExtraction?.bestEmail || null,
      emailSource: result.emailExtraction?.source || null,
      allEmailsFound: result.emailExtraction?.emails || [],
    });
  } catch (error) {
    console.error('Error analyzing prospect:', error);
    return NextResponse.json(
      { error: 'Failed to analyze website' },
      { status: 500 }
    );
  }
}
