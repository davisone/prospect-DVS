import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prospects, analyses, emailDrafts } from '@/lib/db/schema';
import { eq, desc, ne, or, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import type { ProspectStatus, ProspectSource } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as ProspectStatus | null;
    const includeExcluded = searchParams.get('includeExcluded') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
      .select({
        prospect: prospects,
        analysis: analyses,
        draft: emailDrafts,
      })
      .from(prospects)
      .leftJoin(analyses, eq(prospects.id, analyses.prospectId))
      .leftJoin(emailDrafts, eq(prospects.id, emailDrafts.prospectId))
      .orderBy(desc(prospects.createdAt))
      .limit(limit)
      .offset(offset);

    // Par défaut, exclure les prospects "not_prospectable" et "sent" sauf si demandé
    if (!includeExcluded) {
      query = query.where(
        and(
          ne(prospects.status, 'sent'),
          or(
            eq(prospects.followUpStatus, 'none'),
            ne(prospects.followUpStatus, 'not_prospectable'),
          )
        )
      ) as typeof query;
    }

    if (status) {
      query = query.where(eq(prospects.status, status)) as typeof query;
    }

    const results = await query;

    const prospectsWithData = results.map((row) => ({
      ...row.prospect,
      analysis: row.analysis
        ? {
            ...row.analysis,
            technologies: JSON.parse(row.analysis.technologies as string),
            obsoleteTech: JSON.parse(row.analysis.obsoleteTech as string),
            rawData: JSON.parse(row.analysis.rawData as string),
          }
        : null,
      draft: row.draft,
    }));

    return NextResponse.json({ prospects: prospectsWithData });
  } catch (error) {
    console.error('Error fetching prospects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospects: prospectList, source = 'csv' } = body as {
      prospects: Array<{
        name: string;
        email?: string;
        url?: string;
        city?: string;
        phone?: string;
      }>;
      source?: ProspectSource;
    };

    if (!prospectList || !Array.isArray(prospectList)) {
      return NextResponse.json(
        { error: 'Invalid prospects data' },
        { status: 400 }
      );
    }

    // Récupérer tous les prospects existants pour vérifier les doublons
    const existingProspects = await db.select().from(prospects);

    const inserted = [];
    const skipped = [];

    for (const prospect of prospectList) {
      if (!prospect.name) continue;

      // Normaliser l'URL pour la comparaison
      const normalizeUrl = (url: string | undefined | null) => {
        if (!url) return null;
        return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      };

      const prospectUrl = normalizeUrl(prospect.url);

      // Vérifier si le prospect existe déjà (par URL ou par nom+ville)
      const existingByUrl = prospectUrl
        ? existingProspects.find(
            (p) => normalizeUrl(p.url) === prospectUrl
          )
        : null;

      const existingByName = existingProspects.find(
        (p) =>
          p.name.toLowerCase() === prospect.name.toLowerCase() &&
          p.city?.toLowerCase() === prospect.city?.toLowerCase()
      );

      const existing = existingByUrl || existingByName;

      if (existing) {
        // Si le prospect existe et est "not_prospectable", on le skip
        if (existing.followUpStatus === 'not_prospectable') {
          skipped.push({ name: prospect.name, reason: 'exclu' });
          continue;
        }
        // Sinon c'est un doublon
        skipped.push({ name: prospect.name, reason: 'doublon' });
        continue;
      }

      const id = uuid();
      await db.insert(prospects).values({
        id,
        name: prospect.name,
        email: prospect.email || null,
        url: prospect.url || null,
        city: prospect.city || null,
        phone: prospect.phone || null,
        source,
        status: 'pending',
        followUpStatus: 'none',
        createdAt: new Date(),
      });

      inserted.push({ id, name: prospect.name });
    }

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      skipped: skipped.length,
      skippedDetails: skipped,
      prospects: inserted,
    });
  } catch (error) {
    console.error('Error creating prospects:', error);
    return NextResponse.json(
      { error: 'Failed to create prospects' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, url, phone, city } = body as {
      id: string;
      email?: string;
      url?: string;
      phone?: string;
      city?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const updateData: Record<string, string | null> = {};
    if (email !== undefined) updateData.email = email || null;
    if (url !== undefined) updateData.url = url || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (city !== undefined) updateData.city = city || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await db.update(prospects).set(updateData).where(eq(prospects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating prospect:', error);
    return NextResponse.json(
      { error: 'Failed to update prospect' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await db.delete(emailDrafts).where(eq(emailDrafts.prospectId, id));
    await db.delete(analyses).where(eq(analyses.prospectId, id));
    await db.delete(prospects).where(eq(prospects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prospect:', error);
    return NextResponse.json(
      { error: 'Failed to delete prospect' },
      { status: 500 }
    );
  }
}
