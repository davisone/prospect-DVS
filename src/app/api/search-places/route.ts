import { NextRequest, NextResponse } from 'next/server';
import { searchAndEnrichPlaces, BUSINESS_TYPES } from '@/lib/google-places';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const type = searchParams.get('type');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    const places = await searchAndEnrichPlaces(query, type || undefined);

    return NextResponse.json({
      places,
      count: places.length,
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
