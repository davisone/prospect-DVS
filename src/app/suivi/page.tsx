'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, Ban } from 'lucide-react';
import type { Prospect, FollowUpStatus } from '@/types';

const FOLLOW_UP_LABELS: Record<FollowUpStatus, { label: string; color: string; icon: React.ReactNode }> = {
  none: { label: 'Aucun', color: 'secondary', icon: null },
  waiting: { label: 'En attente', color: 'default', icon: <Clock className="h-4 w-4" /> },
  accepted: { label: 'Validé', color: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  refused: { label: 'Refusé', color: 'destructive', icon: <XCircle className="h-4 w-4" /> },
  no_response: { label: 'Pas de réponse', color: 'secondary', icon: <AlertCircle className="h-4 w-4" /> },
  not_prospectable: { label: 'Plus prospectable', color: 'destructive', icon: <Ban className="h-4 w-4" /> },
};

export default function SuiviPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prospects/follow-up');
      const data = await response.json();
      if (data.prospects) {
        setProspects(data.prospects);
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

  const updateStatus = async (prospectId: string, newStatus: FollowUpStatus) => {
    setUpdating(prospectId);
    try {
      const response = await fetch('/api/prospects/follow-up', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId, followUpStatus: newStatus }),
      });

      if (response.ok) {
        // Mettre à jour localement
        setProspects((prev) =>
          prev.map((p) =>
            p.id === prospectId ? { ...p, followUpStatus: newStatus } : p
          )
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getProspectsByStatus = (status: FollowUpStatus) =>
    prospects.filter((p) => p.followUpStatus === status);

  const stats = {
    waiting: getProspectsByStatus('waiting').length,
    accepted: getProspectsByStatus('accepted').length,
    refused: getProspectsByStatus('refused').length,
    no_response: getProspectsByStatus('no_response').length,
    not_prospectable: getProspectsByStatus('not_prospectable').length,
  };

  const ProspectRow = ({ prospect }: { prospect: Prospect }) => (
    <TableRow>
      <TableCell className="font-medium">{prospect.name}</TableCell>
      <TableCell>{prospect.city || '-'}</TableCell>
      <TableCell>
        {prospect.url ? (
          <a
            href={prospect.url.startsWith('http') ? prospect.url : `https://${prospect.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            Voir <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell>{prospect.email || '-'}</TableCell>
      <TableCell>
        <Select
          value={prospect.followUpStatus || 'none'}
          onValueChange={(value) => updateStatus(prospect.id, value as FollowUpStatus)}
          disabled={updating === prospect.id}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="waiting">En attente</SelectItem>
            <SelectItem value="accepted">Validé</SelectItem>
            <SelectItem value="refused">Refusé</SelectItem>
            <SelectItem value="no_response">Pas de réponse</SelectItem>
            <SelectItem value="not_prospectable">Plus prospectable</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {prospect.followUpAt
          ? new Date(prospect.followUpAt).toLocaleDateString('fr-FR')
          : '-'}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suivi des prospects</h1>
          <p className="text-muted-foreground">
            Gérez les réponses et le statut de vos prospects démarchés
          </p>
        </div>
        <Button variant="outline" onClick={fetchProspects} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Validés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Refusés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.refused}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              Pas de réponse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.no_response}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4 text-gray-400" />
              Exclus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{stats.not_prospectable}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs par statut */}
      <Tabs defaultValue="waiting" className="space-y-4">
        <TabsList>
          <TabsTrigger value="waiting" className="gap-2">
            En attente
            {stats.waiting > 0 && (
              <Badge variant="secondary">{stats.waiting}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            Validés
            {stats.accepted > 0 && (
              <Badge variant="secondary">{stats.accepted}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="refused" className="gap-2">
            Refusés
            {stats.refused > 0 && (
              <Badge variant="secondary">{stats.refused}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="no_response" className="gap-2">
            Pas de réponse
            {stats.no_response > 0 && (
              <Badge variant="secondary">{stats.no_response}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="not_prospectable" className="gap-2">
            Exclus
            {stats.not_prospectable > 0 && (
              <Badge variant="secondary">{stats.not_prospectable}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {(['waiting', 'accepted', 'refused', 'no_response', 'not_prospectable'] as FollowUpStatus[]).map(
          (status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardContent className="pt-6">
                  {getProspectsByStatus(status).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun prospect dans cette catégorie
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entreprise</TableHead>
                          <TableHead>Ville</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Mis à jour</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getProspectsByStatus(status).map((prospect) => (
                          <ProspectRow key={prospect.id} prospect={prospect} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}