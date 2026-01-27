'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestEmail = async () => {
    if (!testEmail) return;

    setTesting(true);
    setTestResult(null);

    try {
      // This would need a test endpoint
      // For now, just simulate
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTestResult({ success: true, message: 'Email de test envoyé (simulation)' });
    } catch (error) {
      setTestResult({ success: false, message: 'Erreur lors du test' });
    } finally {
      setTesting(false);
    }
  };

  const envVars = [
    { name: 'OPENAI_API_KEY', label: 'OpenAI API Key', required: true },
    { name: 'RESEND_API_KEY', label: 'Resend API Key', required: true },
    { name: 'GOOGLE_PLACES_API_KEY', label: 'Google Places API Key', required: true },
    { name: 'SENDER_EMAIL', label: 'Email expéditeur', required: false },
    { name: 'SENDER_NAME', label: 'Nom expéditeur', required: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration de l'application Smart Detection
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variables d'environnement</CardTitle>
          <CardDescription>
            Ces variables doivent être configurées dans le fichier .env.local
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {envVars.map((v) => (
              <div key={v.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{v.label}</p>
                  <code className="text-sm text-muted-foreground">{v.name}</code>
                </div>
                <Badge variant={v.required ? 'default' : 'secondary'}>
                  {v.required ? 'Requis' : 'Optionnel'}
                </Badge>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Configuration requise</h4>
            <p className="text-sm text-muted-foreground">
              Créez un fichier <code>.env.local</code> à la racine du projet avec les clés API nécessaires :
            </p>
            <pre className="mt-2 p-3 bg-background rounded text-sm overflow-x-auto">
{`OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
GOOGLE_PLACES_API_KEY=AIza...
SENDER_EMAIL=contact@dvs-web.fr
SENDER_NAME=DVS Web`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limites d'envoi</CardTitle>
          <CardDescription>
            Configuration des contraintes d'envoi d'emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <p className="font-medium">Limite quotidienne</p>
              <p className="text-2xl font-bold">20 emails/jour</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-medium">Horaires d'envoi</p>
              <p className="text-2xl font-bold">9h - 11h</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-medium">Jours d'envoi</p>
              <p className="text-2xl font-bold">Mar, Mer, Jeu</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-medium">Délai entre envois</p>
              <p className="text-2xl font-bold">2-5 min</p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Important</p>
              <p className="text-sm text-yellow-700">
                Ces limites sont codées en dur pour respecter les bonnes pratiques d'envoi d'emails de prospection.
                Modifier ces valeurs pourrait affecter la délivrabilité de vos emails.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test d'envoi</CardTitle>
          <CardDescription>
            Envoyez un email de test pour vérifier la configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="testEmail">Email de test</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="votre@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleTestEmail} disabled={testing || !testEmail}>
                {testing ? 'Envoi...' : 'Envoyer un test'}
              </Button>
            </div>
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                testResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zone géographique</CardTitle>
          <CardDescription>
            Configuration de la recherche Google Places
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <p className="font-medium">Centre de recherche</p>
              <p className="text-lg">Rennes (48.1173, -1.6778)</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-medium">Rayon de recherche</p>
              <p className="text-lg">50 km</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            La recherche couvre tout le département de l'Ille-et-Vilaine.
            Les chaînes nationales sont automatiquement exclues des résultats.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
