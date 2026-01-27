'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface QueueStatusData {
  pending: number;
  sent: number;
  failed: number;
  nextScheduled: string | null;
  dailyRemaining: number;
}

export function QueueStatus() {
  const [status, setStatus] = useState<QueueStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/queue');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' }),
      });
      await fetchStatus();
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">File d'attente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">File d'attente</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleProcess}
            disabled={processing || status?.pending === 0}
          >
            <Play className="h-4 w-4 mr-1" />
            {processing ? 'Traitement...' : 'Traiter'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{status?.pending || 0} en attente</Badge>
          <Badge variant="success">{status?.sent || 0} envoyés</Badge>
          {(status?.failed || 0) > 0 && (
            <Badge variant="destructive">{status?.failed} échecs</Badge>
          )}
        </div>

        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Quota du jour :</span>{' '}
            <span className="font-medium">{status?.dailyRemaining || 0}/20 restants</span>
          </p>
          {status?.nextScheduled && (
            <p>
              <span className="text-muted-foreground">Prochain envoi :</span>{' '}
              <span className="font-medium">
                {formatDate(new Date(status.nextScheduled))}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
