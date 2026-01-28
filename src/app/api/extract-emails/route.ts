import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prospects } from '@/lib/db/schema';
import { eq, isNull, and, isNotNull } from 'drizzle-orm';
import { extractEmails } from '@/lib/analysis/checks/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectIds } = body as { prospectIds?: string[] };

    // Récupérer les prospects sans email mais avec une URL
    let prospectsToProcess;

    if (prospectIds && prospectIds.length > 0) {
      // Extraire pour des prospects spécifiques
      prospectsToProcess = await db
        .select()
        .from(prospects)
        .where(
          and(
            isNull(prospects.email),
            isNotNull(prospects.url)
          )
        );
      prospectsToProcess = prospectsToProcess.filter(p => prospectIds.includes(p.id));
    } else {
      // Extraire pour tous les prospects sans email
      prospectsToProcess = await db
        .select()
        .from(prospects)
        .where(
          and(
            isNull(prospects.email),
            isNotNull(prospects.url)
          )
        );
    }

    if (prospectsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        found: 0,
        message: 'Aucun prospect sans email à traiter',
      });
    }

    let found = 0;
    const results: { id: string; name: string; email: string | null }[] = [];

    // Traiter par lots de 5 pour éviter de surcharger
    const batchSize = 5;

    for (let i = 0; i < prospectsToProcess.length; i += batchSize) {
      const batch = prospectsToProcess.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (prospect) => {
          if (!prospect.url) return { id: prospect.id, name: prospect.name, email: null };

          try {
            const emailResult = await extractEmails(prospect.url);

            if (emailResult.bestEmail) {
              await db
                .update(prospects)
                .set({ email: emailResult.bestEmail })
                .where(eq(prospects.id, prospect.id));

              return {
                id: prospect.id,
                name: prospect.name,
                email: emailResult.bestEmail,
              };
            }

            return { id: prospect.id, name: prospect.name, email: null };
          } catch (error) {
            console.error(`Error extracting email for ${prospect.name}:`, error);
            return { id: prospect.id, name: prospect.name, email: null };
          }
        })
      );

      results.push(...batchResults);
      found += batchResults.filter(r => r.email).length;
    }

    return NextResponse.json({
      success: true,
      processed: prospectsToProcess.length,
      found,
      results,
    });
  } catch (error) {
    console.error('Error extracting emails:', error);
    return NextResponse.json(
      { error: 'Failed to extract emails' },
      { status: 500 }
    );
  }
}

// GET pour obtenir le nombre de prospects sans email
export async function GET() {
  try {
    const prospectsWithoutEmail = await db
      .select()
      .from(prospects)
      .where(
        and(
          isNull(prospects.email),
          isNotNull(prospects.url)
        )
      );

    return NextResponse.json({
      count: prospectsWithoutEmail.length,
    });
  } catch (error) {
    console.error('Error counting prospects:', error);
    return NextResponse.json(
      { error: 'Failed to count prospects' },
      { status: 500 }
    );
  }
}
