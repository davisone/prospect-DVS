import { NextRequest } from 'next/server';
import { searchAndEnrichPlaces, BUSINESS_TYPES } from '@/lib/google-places';
import { DEPARTMENTS, DEPARTMENT_SEARCH_RADIUS } from '@/lib/departments';
import { db } from '@/lib/db';
import { prospects } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';

// Normaliser l'URL pour la comparaison
function normalizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
}

// Extraire le domaine pour une comparaison plus large
function extractDomain(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return hostname;
  } catch {
    return normalizeUrl(url)?.split('/')[0] || null;
  }
}

function extractCity(address: string): string {
  const parts = address.split(',');
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2]?.trim() || '';
    return cityPart.replace(/^\d{5}\s*/, '').trim();
  }
  return '';
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const departmentCode = body.departmentCode as string | undefined;

  // Filtrer sur un seul département si fourni
  const departments = departmentCode
    ? DEPARTMENTS.filter((d) => d.code === departmentCode)
    : DEPARTMENTS;

  if (departmentCode && departments.length === 0) {
    return new Response(JSON.stringify({ error: 'Département introuvable' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const totalCombinations = departments.length * BUSINESS_TYPES.length;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(data: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Le stream a été fermé côté client
        }
      }

      let totalImported = 0;
      let current = 0;

      try {
        // Charger les prospects existants une seule fois pour les doublons
        const existingProspects = await db.select().from(prospects);
        const existingUrls = new Set(
          existingProspects.map((p) => normalizeUrl(p.url)).filter(Boolean)
        );
        const existingDomains = new Set(
          existingProspects.map((p) => extractDomain(p.url)).filter(Boolean)
        );
        const existingNames = new Set(
          existingProspects.map((p) => p.name.toLowerCase())
        );

        for (const department of departments) {
          for (const businessType of BUSINESS_TYPES) {
            current++;

            try {
              const places = await searchAndEnrichPlaces(
                businessType.label,
                businessType.value,
                {
                  lat: department.lat,
                  lng: department.lng,
                  radius: DEPARTMENT_SEARCH_RADIUS,
                  departmentName: department.name,
                }
              );

              let importedInBatch = 0;

              for (const place of places) {
                const placeUrl = normalizeUrl(place.website);
                const placeDomain = extractDomain(place.website);
                const placeName = place.name.toLowerCase();

                // Filtrer les doublons par URL exacte, domaine, ou nom
                if (placeUrl && existingUrls.has(placeUrl)) continue;
                if (placeDomain && existingDomains.has(placeDomain)) continue;
                if (existingNames.has(placeName)) continue;

                // Insérer en BDD
                const id = uuid();
                await db.insert(prospects).values({
                  id,
                  name: place.name,
                  email: place.email || null,
                  url: place.website || null,
                  city: extractCity(place.address),
                  phone: place.phone || null,
                  source: 'google_places',
                  status: 'pending',
                  followUpStatus: 'none',
                  createdAt: new Date(),
                });

                // Ajouter aux sets pour éviter les doublons dans la même session
                if (placeUrl) existingUrls.add(placeUrl);
                if (placeDomain) existingDomains.add(placeDomain);
                existingNames.add(placeName);

                importedInBatch++;
                totalImported++;
              }

              sendEvent({
                type: 'progress',
                department: department.name,
                departmentCode: department.code,
                businessType: businessType.label,
                found: importedInBatch,
                total: totalCombinations,
                current,
                totalImported,
              });
            } catch (error) {
              console.error(
                `Error searching ${businessType.label} in ${department.name}:`,
                error
              );

              sendEvent({
                type: 'error',
                department: department.name,
                businessType: businessType.label,
                message: error instanceof Error ? error.message : 'Unknown error',
                total: totalCombinations,
                current,
                totalImported,
              });
            }
          }
        }

        sendEvent({
          type: 'complete',
          totalImported,
          total: totalCombinations,
        });
      } catch (error) {
        console.error('Bulk search fatal error:', error);
        sendEvent({
          type: 'fatal_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          totalImported,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
