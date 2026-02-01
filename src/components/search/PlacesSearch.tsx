'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Square } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DEPARTMENTS } from '@/lib/departments';
import { BUSINESS_TYPES } from '@/lib/google-places';

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'fatal_error';
  department?: string;
  departmentCode?: string;
  businessType?: string;
  found?: number;
  total?: number;
  current?: number;
  totalImported?: number;
  message?: string;
}

export function PlacesSearch() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // useRef pour garder la dernière valeur de totalImported accessible dans le catch
  const lastTotalImportedRef = useRef(0);

  const handleSearch = useCallback(async () => {
    if (!selectedDepartment) return;

    setSearching(true);
    setMessage(null);
    setProgress(null);
    lastTotalImportedRef.current = 0;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/search-places/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentCode: selectedDepartment }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la recherche');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Pas de stream disponible');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith('data: ')) continue;

          try {
            const event: ProgressEvent = JSON.parse(dataLine.slice(6));
            setProgress(event);
            lastTotalImportedRef.current = event.totalImported || 0;

            if (event.type === 'complete') {
              setMessage({
                type: 'success',
                text: `Recherche terminée ! ${event.totalImported} prospects importés au total.`,
              });
              setSearching(false);
            } else if (event.type === 'fatal_error') {
              setMessage({
                type: 'error',
                text: `Erreur fatale : ${event.message}. ${event.totalImported} prospects importés avant l'erreur.`,
              });
              setSearching(false);
            }
          } catch {
            // Ignorer les lignes mal formées
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const imported = lastTotalImportedRef.current;
        setMessage({
          type: 'info',
          text: `Recherche arrêtée. ${imported} prospect(s) déjà importé(s) et conservé(s) en base.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Erreur de connexion',
        });
      }
    } finally {
      setSearching(false);
      abortControllerRef.current = null;
    }
  }, [selectedDepartment]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const progressPercent = progress?.total && progress?.current
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const selectedDeptName = DEPARTMENTS.find((d) => d.code === selectedDepartment)?.name;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recherche Google Places</CardTitle>
          <CardDescription>
            Sélectionnez un département puis lancez la recherche sur les {BUSINESS_TYPES.length} types de métiers.
            Les prospects avec site web sont importés automatiquement en base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="department">Département</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={searching}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un département..." />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code}>
                      {dept.code} — {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              {!searching ? (
                <Button onClick={handleSearch} disabled={!selectedDepartment} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Lancer la recherche
                </Button>
              ) : (
                <Button onClick={handleStop} variant="destructive" className="w-full">
                  <Square className="h-4 w-4 mr-2" />
                  Arrêter
                </Button>
              )}
            </div>
          </div>

          {(searching || progress) && progress && (
            <div className="space-y-3">
              <Progress value={progress.type === 'complete' ? 100 : progressPercent} className="h-3" />
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-muted-foreground">Progression</p>
                  <p className="font-bold text-lg">{progress.current}/{progress.total}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-muted-foreground">Métier en cours</p>
                  <p className="font-bold text-lg truncate">{progress.businessType || '—'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-muted-foreground">Prospects importés</p>
                  <p className="font-bold text-lg text-green-600">{progress.totalImported}</p>
                </div>
              </div>
              {searching && (
                <p className="text-xs text-muted-foreground">
                  {progressPercent}% — Dernière recherche : {progress.found} nouveau(x) prospect(s) trouvé(s)
                </p>
              )}
            </div>
          )}

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
    </div>
  );
}
