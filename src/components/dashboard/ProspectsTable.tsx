'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Search, Trash2, Eye, Mail, MailX, AlertTriangle } from 'lucide-react';
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils';
import type { ProspectWithAnalysis } from '@/types';

interface ProspectsTableProps {
  prospects: ProspectWithAnalysis[];
  onRefresh: () => void;
}

export function ProspectsTable({ prospects, onRefresh }: ProspectsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailFilter, setEmailFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Stats
  const withEmail = prospects.filter((p) => p.email).length;
  const withoutEmail = prospects.length - withEmail;

  const filteredProspects = prospects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    const matchesEmail =
      emailFilter === 'all' ||
      (emailFilter === 'with_email' && p.email) ||
      (emailFilter === 'without_email' && !p.email);

    return matchesSearch && matchesStatus && matchesEmail;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce prospect ?')) return;

    setDeleting(id);
    try {
      await fetch(`/api/prospects?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (error) {
      console.error('Error deleting prospect:', error);
    } finally {
      setDeleting(null);
    }
  };

  const getScoreBadge = (score?: number) => {
    if (score === undefined || score === null) return null;

    let variant: 'success' | 'warning' | 'destructive' | 'secondary' = 'secondary';
    if (score >= 70) variant = 'success';
    else if (score >= 40) variant = 'warning';
    else variant = 'destructive';

    return <Badge variant={variant}>{score}/100</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Warning banner if many prospects without email */}
      {withoutEmail > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{withoutEmail}</strong> prospect(s) sans adresse email sur <strong>{prospects.length}</strong> total.
            Les prospects sans email ne peuvent pas recevoir de mail de prospection.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={emailFilter} onValueChange={setEmailFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par email" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous ({prospects.length})</SelectItem>
            <SelectItem value="with_email">
              Avec email ({withEmail})
            </SelectItem>
            <SelectItem value="without_email">
              Sans email ({withoutEmail})
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="analyzed">Analysé</SelectItem>
            <SelectItem value="draft_ready">Brouillon prêt</SelectItem>
            <SelectItem value="queued">En file</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProspects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun prospect trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredProspects.map((prospect) => (
                <TableRow key={prospect.id} className={!prospect.email ? 'bg-yellow-50/50' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {prospect.email ? (
                        <Mail className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <MailX className="h-4 w-4 text-red-500 flex-shrink-0" title="Pas d'email" />
                      )}
                      <div>
                        {prospect.name}
                        {prospect.email ? (
                          <div className="text-sm text-muted-foreground">{prospect.email}</div>
                        ) : (
                          <div className="text-sm text-red-500">Pas d'email</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{prospect.city || '-'}</TableCell>
                  <TableCell>
                    {prospect.url ? (
                      <a
                        href={prospect.url.startsWith('http') ? prospect.url : `https://${prospect.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">
                          {prospect.url.replace(/^https?:\/\//, '')}
                        </span>
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{getScoreBadge(prospect.analysis?.score)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(prospect.status)}>
                      {getStatusLabel(prospect.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(prospect.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/prospects/${prospect.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(prospect.id)}
                        disabled={deleting === prospect.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
