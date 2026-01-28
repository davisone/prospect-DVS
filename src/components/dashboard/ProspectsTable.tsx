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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Search, Trash2, Eye, Mail, MailX, AlertTriangle, X, RefreshCw } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [extractingEmails, setExtractingEmails] = useState(false);

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

  // Sélection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProspects.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Supprimer ${count} prospect(s) sélectionné(s) ?`)) return;

    setDeletingBulk(true);
    try {
      // Supprimer en parallèle par lots de 10
      const ids = Array.from(selectedIds);
      const batchSize = 10;

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        await Promise.all(
          batch.map(id => fetch(`/api/prospects?id=${id}`, { method: 'DELETE' }))
        );
      }

      setSelectedIds(new Set());
      onRefresh();
    } catch (error) {
      console.error('Error deleting prospects:', error);
    } finally {
      setDeletingBulk(false);
    }
  };

  // Extraction d'emails pour les prospects sélectionnés sans email
  const handleExtractEmails = async () => {
    const prospectsWithoutEmail = filteredProspects.filter(
      p => selectedIds.has(p.id) && !p.email && p.url
    );

    if (prospectsWithoutEmail.length === 0) {
      alert('Aucun prospect sélectionné sans email à traiter');
      return;
    }

    setExtractingEmails(true);
    try {
      const response = await fetch('/api/extract-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: prospectsWithoutEmail.map(p => p.id) }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Extraction terminée: ${data.found} email(s) trouvé(s) sur ${data.processed} prospect(s)`);
        setSelectedIds(new Set());
        onRefresh();
      } else {
        alert(data.error || 'Erreur lors de l\'extraction');
      }
    } catch (error) {
      console.error('Error extracting emails:', error);
      alert('Erreur de connexion');
    } finally {
      setExtractingEmails(false);
    }
  };

  // Extraction d'emails pour TOUS les prospects sans email
  const handleExtractAllEmails = async () => {
    if (!confirm(`Extraire les emails de tous les ${withoutEmail} prospects sans email ? Cela peut prendre un moment.`)) {
      return;
    }

    setExtractingEmails(true);
    try {
      const response = await fetch('/api/extract-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Extraction terminée: ${data.found} email(s) trouvé(s) sur ${data.processed} prospect(s)`);
        onRefresh();
      } else {
        alert(data.error || 'Erreur lors de l\'extraction');
      }
    } catch (error) {
      console.error('Error extracting emails:', error);
      alert('Erreur de connexion');
    } finally {
      setExtractingEmails(false);
    }
  };

  // Calcul de l'état de la checkbox "tout sélectionner"
  const allSelected = filteredProspects.length > 0 && selectedIds.size === filteredProspects.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredProspects.length;

  // Nombre de prospects sélectionnés sans email
  const selectedWithoutEmail = filteredProspects.filter(
    p => selectedIds.has(p.id) && !p.email && p.url
  ).length;

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
        <div className="flex items-center justify-between gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>{withoutEmail}</strong> prospect(s) sans adresse email sur <strong>{prospects.length}</strong> total.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExtractAllEmails}
            disabled={extractingEmails}
            className="bg-white hover:bg-yellow-100"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${extractingEmails ? 'animate-spin' : ''}`} />
            {extractingEmails ? 'Extraction...' : 'Extraire les emails'}
          </Button>
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

      {/* Barre d'actions de sélection */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-800">
              {selectedIds.size} prospect(s) sélectionné(s)
              {selectedWithoutEmail > 0 && (
                <span className="text-blue-600 ml-1">
                  ({selectedWithoutEmail} sans email)
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4 mr-1" />
              Désélectionner
            </Button>
          </div>
          <div className="flex gap-2">
            {selectedWithoutEmail > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtractEmails}
                disabled={extractingEmails}
                className="bg-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${extractingEmails ? 'animate-spin' : ''}`} />
                {extractingEmails ? 'Extraction...' : `Extraire emails (${selectedWithoutEmail})`}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={deletingBulk}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deletingBulk ? 'Suppression...' : `Supprimer (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Tout sélectionner"
                />
              </TableHead>
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
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucun prospect trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredProspects.map((prospect) => (
                <TableRow
                  key={prospect.id}
                  className={`${!prospect.email ? 'bg-yellow-50/50' : ''} ${selectedIds.has(prospect.id) ? 'bg-blue-50' : ''}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(prospect.id)}
                      onCheckedChange={() => toggleSelect(prospect.id)}
                      aria-label={`Sélectionner ${prospect.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {prospect.email ? (
                        <Mail className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <MailX className="h-4 w-4 text-red-500 flex-shrink-0" />
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
