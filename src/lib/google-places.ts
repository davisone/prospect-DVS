import type { GooglePlaceResult } from '@/types';
import { extractEmails } from '@/lib/analysis/checks/email';

// Ille-et-Vilaine center (Rennes)
const ILLE_ET_VILAINE_CENTER = {
  lat: 48.1173,
  lng: -1.6778,
};

const SEARCH_RADIUS = 50000; // 50km

export const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bakery', label: 'Boulangerie' },
  { value: 'hair_care', label: 'Coiffeur' },
  { value: 'beauty_salon', label: 'Salon de beauté' },
  { value: 'car_repair', label: 'Garage auto' },
  { value: 'dentist', label: 'Dentiste' },
  { value: 'doctor', label: 'Médecin' },
  { value: 'veterinary_care', label: 'Vétérinaire' },
  { value: 'real_estate_agency', label: 'Agence immobilière' },
  { value: 'lawyer', label: 'Avocat' },
  { value: 'accounting', label: 'Comptable' },
  { value: 'plumber', label: 'Plombier' },
  { value: 'electrician', label: 'Électricien' },
  { value: 'florist', label: 'Fleuriste' },
  { value: 'gym', label: 'Salle de sport' },
  { value: 'spa', label: 'Spa' },
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
  type?: string
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  // Use Text Search API (New)
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} Ille-et-Vilaine`);
  url.searchParams.set('location', `${ILLE_ET_VILAINE_CENTER.lat},${ILLE_ET_VILAINE_CENTER.lng}`);
  url.searchParams.set('radius', SEARCH_RADIUS.toString());
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
  type?: string
): Promise<GooglePlaceResult[]> {
  const places = await searchPlaces(query, type);

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
