'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, Check, AlertCircle, AlertTriangle, Mail } from 'lucide-react';
import Papa from 'papaparse';

interface ParsedProspect {
  name: string;
  email: string;
  url?: string;
  city?: string;
  phone?: string;
}

export function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [prospects, setProspects] = useState<ParsedProspect[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];

        let skipped = 0;
        const parsed: ParsedProspect[] = [];

        for (const row of data) {
          const name = row.name || row.nom || row.entreprise || row.company || '';
          const email = row.email || row.mail || row.courriel || '';

          if (!name) continue;

          // Only keep prospects with email
          if (!email || !email.includes('@')) {
            skipped++;
            continue;
          }

          parsed.push({
            name,
            email,
            url: row.url || row.site || row.website || row.siteweb || '',
            city: row.city || row.ville || row.location || '',
            phone: row.phone || row.telephone || row.tel || '',
          });
        }

        setProspects(parsed);
        setSkippedCount(skipped);
      },
      error: () => {
        setResult({ success: false, message: 'Erreur de parsing du CSV' });
      },
    });
  };

  const handleImport = async () => {
    if (prospects.length === 0) return;

    setImporting(true);
    try {
      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects, source: 'csv' }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `${data.inserted} prospects importes avec succes`,
        });
        setProspects([]);
        setSkippedCount(0);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setResult({ success: false, message: data.error || 'Erreur lors de limport' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Erreur de connexion' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import CSV</CardTitle>
          <CardDescription>
            Importez vos prospects depuis un fichier CSV.
            <strong> Seuls les prospects avec une adresse email valide seront importes.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>Colonnes requises :</strong> name/nom + email/mail.
              Optionnelles : url/site, city/ville, phone/telephone
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>

          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                result.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {result.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {result.message}
            </div>
          )}
        </CardContent>
      </Card>

      {(prospects.length > 0 || skippedCount > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                {prospects.length} prospects avec email
              </CardTitle>
              <CardDescription>
                Prets a etre importes
              </CardDescription>
            </div>
            <Button onClick={handleImport} disabled={importing || prospects.length === 0}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Import...' : `Importer ${prospects.length} prospects`}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {skippedCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>{skippedCount}</strong> ligne(s) ignoree(s) car sans adresse email valide
                </span>
              </div>
            )}

            {prospects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun prospect avec email valide dans ce fichier</p>
                <p className="text-sm mt-2">Verifiez que votre CSV contient une colonne email/mail avec des adresses valides</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Site web</TableHead>
                        <TableHead>Ville</TableHead>
                        <TableHead>Telephone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prospects.slice(0, 50).map((prospect, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{prospect.name}</TableCell>
                          <TableCell className="text-green-600">{prospect.email}</TableCell>
                          <TableCell className="truncate max-w-[200px]">
                            {prospect.url || '-'}
                          </TableCell>
                          <TableCell>{prospect.city || '-'}</TableCell>
                          <TableCell>{prospect.phone || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {prospects.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ... et {prospects.length - 50} autres prospects
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
