import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prospects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { FollowUpStatus } from '@/types';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectId, followUpStatus, note } = body as {
      prospectId: string;
      followUpStatus: FollowUpStatus;
      note?: string;
    };

    if (!prospectId || !followUpStatus) {
      return NextResponse.json(
        { error: 'prospectId and followUpStatus are required' },
        { status: 400 }
      );
    }

    const validStatuses: FollowUpStatus[] = ['none', 'waiting', 'accepted', 'refused', 'no_response', 'not_prospectable'];
    if (!validStatuses.includes(followUpStatus)) {
      return NextResponse.json(
        { error: 'Invalid followUpStatus' },
        { status: 400 }
      );
    }

    await db
      .update(prospects)
      .set({
        followUpStatus,
        followUpNote: note || null,
        followUpAt: new Date(),
      })
      .where(eq(prospects.id, prospectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating follow-up status:', error);
    return NextResponse.json(
      { error: 'Failed to update follow-up status' },
      { status: 500 }
    );
  }
}

// Récupérer tous les prospects avec un suivi actif (pas 'none')
export async function GET() {
  try {
    // SQLite doesn't have a nice way to do != 'none' OR IS NULL
    // So we fetch all and filter in JS
    const result = await db.select().from(prospects);

    // Filtrer les prospects qui ont un suivi actif
    const followedUp = result.filter(
      (p) => p.followUpStatus && p.followUpStatus !== 'none'
    );

    return NextResponse.json({ prospects: followedUp });
  } catch (error) {
    console.error('Error fetching followed-up prospects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}