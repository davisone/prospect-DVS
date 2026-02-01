import { NextRequest, NextResponse } from 'next/server';
import { searchAndEnrichPlaces, BUSINESS_TYPES } from '@/lib/google-places';
import { db } from '@/lib/db';
import { prospects } from '@/lib/db/schema';

// Normaliser l'URL pour la comparaison
function normalizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const type = searchParams.get('type');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const department = searchParams.get('department');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    const options = lat && lng ? {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      departmentName: department || undefined,
    } : undefined;

    const places = await searchAndEnrichPlaces(query, type || undefined, options);

    // Récupérer tous les prospects existants pour filtrer les doublons
    const existingProspects = await db.select().from(prospects);

    // Créer des sets pour une recherche rapide
    const existingUrls = new Set(
      existingProspects
        .map((p) => normalizeUrl(p.url))
        .filter(Boolean)
    );
    const existingNames = new Set(
      existingProspects.map((p) => p.name.toLowerCase())
    );

    // Filtrer les places qui existent déjà dans la base
    const filteredPlaces = places.filter((place) => {
      const placeUrl = normalizeUrl(place.website);
      const placeName = place.name.toLowerCase();

      // Exclure si l'URL existe déjà
      if (placeUrl && existingUrls.has(placeUrl)) {
        return false;
      }

      // Exclure si le nom exact existe déjà
      if (existingNames.has(placeName)) {
        return false;
      }

      return true;
    });

    const excludedCount = places.length - filteredPlaces.length;

    return NextResponse.json({
      places: filteredPlaces,
      count: filteredPlaces.length,
      excludedCount, // Nombre de résultats exclus car déjà en base
      totalFound: places.length,
    });
  } catch (error) {
    console.error('Error searching places:', error);
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Return available business types
  return NextResponse.json({ types: BUSINESS_TYPES });
}
