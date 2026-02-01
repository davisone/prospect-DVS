import type { GooglePlaceResult } from '@/types';
import { extractEmails } from '@/lib/analysis/checks/email';
import { DEPARTMENT_SEARCH_RADIUS } from '@/lib/departments';

export const BUSINESS_TYPES = [
  // Artisans du bâtiment
  { value: 'plumber', label: 'Plombier' },
  { value: 'electrician', label: 'Électricien' },
  { value: 'roofing_contractor', label: 'Couvreur' },
  { value: 'general_contractor', label: 'Maçon' },
  { value: 'painter', label: 'Peintre en bâtiment' },
  { value: 'carpenter', label: 'Menuisier' },
  { value: 'carpenter', label: 'Charpentier' },
  { value: 'locksmith', label: 'Serrurier' },
  { value: 'general_contractor', label: 'Carreleur' },
  { value: 'general_contractor', label: 'Terrassier' },
  { value: 'general_contractor', label: 'Plaquiste' },
  { value: 'general_contractor', label: 'Chauffagiste' },
  // Commerces de proximité / TPE
  { value: 'bakery', label: 'Boulangerie' },
  { value: 'hair_care', label: 'Coiffeur' },
  { value: 'florist', label: 'Fleuriste' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'car_repair', label: 'Garage auto' },
] as const;

// National chains to exclude
const EXCLUDED_CHAINS = [
  "mcdonald's",
  'burger king',
  'kfc',
  'subway',
  'starbucks',
  'paul',
  'brioche dorée',
  'class croute',
  'carrefour',
  'leclerc',
  'auchan',
  'intermarché',
  'lidl',
  'aldi',
  'franprix',
  'monoprix',
  'casino',
  'sephora',
  'yves rocher',
  'nocibé',
  'marionnaud',
  'optical center',
  'alain afflelou',
  'krys',
  'specsavers',
  'century 21',
  'laforêt',
  'orpi',
  'guy hoquet',
  'era immobilier',
  'decathlon',
  'go sport',
  'intersport',
  'basic fit',
  'fitness park',
  'keep cool',
];

function isNationalChain(name: string): boolean {
  const lowerName = name.toLowerCase();
  return EXCLUDED_CHAINS.some((chain) => lowerName.includes(chain));
}

export async function searchPlaces(
  query: string,
  type?: string,
  options?: { lat: number; lng: number; radius?: number; departmentName?: string }
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const lat = options?.lat ?? 48.1173;
  const lng = options?.lng ?? -1.6778;
  const radius = options?.radius ?? DEPARTMENT_SEARCH_RADIUS;
  const departmentName = options?.departmentName ?? 'Ille-et-Vilaine';

  // Use Text Search API (New)
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} ${departmentName}`);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', radius.toString());
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'fr');

  if (type) {
    url.searchParams.set('type', type);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  const results: GooglePlaceResult[] = [];

  for (const place of data.results || []) {
    // Skip national chains
    if (isNationalChain(place.name)) {
      continue;
    }

    results.push({
      name: place.name,
      address: place.formatted_address || '',
      phone: undefined, // Need Place Details API for phone
      website: undefined, // Need Place Details API for website
      placeId: place.place_id,
      types: place.types || [],
    });
  }

  return results;
}

export async function getPlaceDetails(placeId: string): Promise<{
  phone?: string;
  website?: string;
  email?: string;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'formatted_phone_number,website');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK') {
    return {};
  }

  const result = data.result || {};

  return {
    phone: result.formatted_phone_number,
    website: result.website,
  };
}

export async function searchAndEnrichPlaces(
  query: string,
  type?: string,
  options?: { lat: number; lng: number; radius?: number; departmentName?: string }
): Promise<GooglePlaceResult[]> {
  const places = await searchPlaces(query, type, options);

  // Enrich with details (phone, website)
  const enrichedPlaces = await Promise.all(
    places.map(async (place) => {
      try {
        const details = await getPlaceDetails(place.placeId);
        return {
          ...place,
          phone: details.phone,
          website: details.website,
        };
      } catch {
        return place;
      }
    })
  );

  // Filter to only include businesses with a website
  const placesWithWebsite = enrichedPlaces.filter((place) => place.website);

  // Extract emails from websites (in parallel, with limit)
  const batchSize = 5; // Limit concurrent requests
  const placesWithEmails: GooglePlaceResult[] = [];

  for (let i = 0; i < placesWithWebsite.length; i += batchSize) {
    const batch = placesWithWebsite.slice(i, i + batchSize);

    const enrichedBatch = await Promise.all(
      batch.map(async (place) => {
        if (!place.website) return place;

        try {
          const emailResult = await extractEmails(place.website);
          return {
            ...place,
            email: emailResult.bestEmail || undefined,
          };
        } catch (error) {
          console.error(`Error extracting email for ${place.name}:`, error);
          return place;
        }
      })
    );

    placesWithEmails.push(...enrichedBatch);
  }

  return placesWithEmails;
}
