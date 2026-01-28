'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Globe, Phone, Plus, Loader2, Mail, MailX } from 'lucide-react';
import type { GooglePlaceResult } from '@/types';

const BUSINESS_TYPES = [
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
];

export function PlacesSearch() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('all');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [excludedCount, setExcludedCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setMessage(null);

    try {
      const params = new URLSearchParams({ query });
      if (type && type !== 'all') params.append('type', type);

      const response = await fetch(`/api/search-places?${params}`);
      const data = await response.json();

      if (response.ok) {
        setResults(data.places || []);
        setExcludedCount(data.excludedCount || 0);
        if (data.places?.length === 0 && data.excludedCount > 0) {
          setMessage({ type: 'info', text: `${data.excludedCount} résultat(s) trouvé(s) mais déjà dans votre base` });
        } else if (data.places?.length === 0) {
          setMessage({ type: 'error', text: 'Aucun résultat avec site web trouvé' });
        } else if (data.excludedCount > 0) {
          setMessage({ type: 'info', text: `${data.excludedCount} résultat(s) masqué(s) car déjà dans votre base` });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur de recherche' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (placeId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.placeId)));
    }
  };

  const handleImport = async () => {
    if (selected.size === 0) return;

    setImporting(true);
    setMessage(null);

    try {
      const selectedPlaces = results.filter((r) => selected.has(r.placeId));
      const prospects = selectedPlaces.map((place) => ({
        name: place.name,
        email: place.email,
        url: place.website,
        phone: place.phone,
        city: extractCity(place.address),
      }));

      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects, source: 'google_places' }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `${data.inserted} prospects importés` });
        setSelected(new Set());
        // Remove imported from results
        setResults(results.filter((r) => !selected.has(r.placeId)));
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur d\'import' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recherche Google Places</CardTitle>
          <CardDescription>
            Recherchez des entreprises en Ille-et-Vilaine. Seules les entreprises avec un site web sont affichées.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="query">Recherche</Label>
              <Input
                id="query"
                placeholder="Ex: boulangerie Rennes, coiffeur Saint-Malo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Label htmlFor="type">Type d'activité</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Rechercher
          </Button>

          {message && (
            <div
              className={`p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : message.type === 'info'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Résultats ({results.length})</CardTitle>
              <CardDescription>
                {selected.size} sélectionné(s) • {results.filter(r => r.email).length} avec email
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={selectAll}>
                {selected.size === results.length ? 'Désélectionner tout' : 'Tout sélectionner'}
              </Button>
              <Button onClick={handleImport} disabled={importing || selected.size === 0}>
                <Plus className="h-4 w-4 mr-2" />
                {importing ? 'Import...' : 'Importer la sélection'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Site web</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((place) => (
                    <TableRow
                      key={place.placeId}
                      className={`cursor-pointer ${
                        selected.has(place.placeId) ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => toggleSelect(place.placeId)}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(place.placeId)}
                          onChange={() => toggleSelect(place.placeId)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{place.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{place.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {place.website && (
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">
                              {place.website.replace(/^https?:\/\//, '')}
                            </span>
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        {place.email ? (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{place.email}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-sm text-red-400">
                            <MailX className="h-3 w-3" />
                            <span>Non trouvé</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {place.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {place.phone}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function extractCity(address: string): string {
  // Try to extract city from French address format
  const parts = address.split(',');
  if (parts.length >= 2) {
    // Usually "Street, PostalCode City, Country"
    const cityPart = parts[parts.length - 2]?.trim() || '';
    // Remove postal code
    return cityPart.replace(/^\d{5}\s*/, '').trim();
  }
  return '';
}
