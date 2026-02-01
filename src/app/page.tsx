'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { ProspectsTable } from '@/components/dashboard/ProspectsTable';
import { QueueStatus } from '@/components/dashboard/QueueStatus';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { ProspectWithAnalysis } from '@/types';

export default function DashboardPage() {
  const [prospects, setProspects] = useState<ProspectWithAnalysis[]>([]);
  const [stats, setStats] = useState({
    totalProspects: 0,
    withEmailCount: 0,
    analyzedCount: 0,
    draftReadyCount: 0,
    queuedCount: 0,
    sentCount: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchProspects = useCallback(async () => {
    try {
      const response = await fetch('/api/prospects?limit=10000');
      const data = await response.json();

      if (data.prospects) {
        setProspects(data.prospects);

        // Calculate stats
        const total = data.prospects.length;
        const withEmail = data.prospects.filter((p: ProspectWithAnalysis) => p.email).length;
        const analyzed = data.prospects.filter((p: ProspectWithAnalysis) => p.analysis).length;
        const draftReady = data.prospects.filter((p: ProspectWithAnalysis) => p.status === 'draft_ready').length;
        const queued = data.prospects.filter((p: ProspectWithAnalysis) => p.status === 'queued').length;
        const sent = data.prospects.filter((p: ProspectWithAnalysis) => p.status === 'sent').length;

        const scores = data.prospects
          .filter((p: ProspectWithAnalysis) => p.analysis?.score !== undefined)
          .map((p: ProspectWithAnalysis) => p.analysis!.score);
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0;

        setStats({
          totalProspects: total,
          withEmailCount: withEmail,
          analyzedCount: analyzed,
          draftReadyCount: draftReady,
          queuedCount: queued,
          sentCount: sent,
          averageScore: avgScore,
        });
      }
    } catch (error) {
      console.error('Error fetching prospects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Gérez vos prospects et suivez vos campagnes de prospection
          </p>
        </div>
        <Button variant="outline" onClick={fetchProspects} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProspectsTable prospects={prospects} onRefresh={fetchProspects} />
        </div>
        <div>
          <QueueStatus />
        </div>
      </div>
    </div>
  );
}
