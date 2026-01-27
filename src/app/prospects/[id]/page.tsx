'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnalysisCard } from '@/components/prospects/AnalysisCard';
import { EmailDraft } from '@/components/prospects/EmailDraft';
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Search,
  Loader2,
  Trash2,
  Pencil,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils';
import type { ProspectWithAnalysis } from '@/types';

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [prospect, setProspect] = useState<ProspectWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProspect = useCallback(async () => {
    try {
      const response = await fetch(`/api/prospects?limit=1000`);
      const data = await response.json();
      const found = data.prospects?.find((p: ProspectWithAnalysis) => p.id === params.id);
      setProspect(found || null);
      if (found) {
        setEditEmail(found.email || '');
        setEditUrl(found.url || '');
        setEditPhone(found.phone || '');
        setEditCity(found.city || '');
      }
    } catch (error) {
      console.error('Error fetching prospect:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProspect();
  }, [fetchProspect]);

  const handleAnalyze = async () => {
    if (!prospect) return;

    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: prospect.id }),
      });

      if (response.ok) {
        await fetchProspect();
      }
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!prospect || !confirm('Supprimer ce prospect ?')) return;

    setDeleting(true);
    try {
      await fetch(`/api/prospects?id=${prospect.id}`, { method: 'DELETE' });
      router.push('/');
    } catch (error) {
      console.error('Error deleting:', error);
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!prospect) return;

    setSaving(true);
    try {
      const response = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prospect.id,
          email: editEmail,
          url: editUrl,
          phone: editPhone,
          city: editCity,
        }),
      });

      if (response.ok) {
        await fetchProspect();
        setEditing(false);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (prospect) {
      setEditEmail(prospect.email || '');
      setEditUrl(prospect.url || '');
      setEditPhone(prospect.phone || '');
      setEditCity(prospect.city || '');
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Prospect non trouve</h2>
        <p className="text-muted-foreground mt-2">Ce prospect nexiste pas ou a ete supprime.</p>
        <Button asChild className="mt-4">
          <Link href="/">Retour au dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{prospect.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getStatusColor(prospect.status)}>
              {getStatusLabel(prospect.status)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Ajoute le {formatDate(prospect.createdAt)}
            </span>
          </div>
        </div>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </div>

      {/* Warning if no email */}
      {!prospect.email && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Pas d&apos;adresse email</p>
            <p className="text-sm">Ce prospect ne peut pas recevoir de mail de prospection. Ajoutez une adresse email ci-dessous.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informations</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              // Edit mode
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="contact@entreprise.fr"
                    className={!editEmail ? 'border-yellow-500' : ''}
                  />
                  {!editEmail && (
                    <p className="text-xs text-yellow-600">Requis pour envoyer des emails</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Site web</Label>
                  <Input
                    id="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="www.entreprise.fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telephone</Label>
                  <Input
                    id="phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="02 99 00 00 00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Rennes"
                  />
                </div>
              </>
            ) : (
              // View mode
              <>
                <div className="flex items-center gap-3">
                  <Mail className={`h-5 w-5 ${prospect.email ? 'text-green-600' : 'text-red-500'}`} />
                  {prospect.email ? (
                    <a href={`mailto:${prospect.email}`} className="text-blue-600 hover:underline">
                      {prospect.email}
                    </a>
                  ) : (
                    <span className="text-red-500 italic">Pas d&apos;email - cliquez sur Modifier pour en ajouter un</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  {prospect.url ? (
                    <a
                      href={prospect.url.startsWith('http') ? prospect.url : `https://${prospect.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {prospect.url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">Non renseigne</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  {prospect.phone ? (
                    <a href={`tel:${prospect.phone}`} className="hover:underline">
                      {prospect.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">Non renseigne</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span>{prospect.city || <span className="text-muted-foreground italic">Non renseigne</span>}</span>
                </div>
              </>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Source : {prospect.source === 'csv' ? 'Import CSV' : 'Google Places'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Actions */}
        {!prospect.analysis && prospect.url && (
          <Card>
            <CardHeader>
              <CardTitle>Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Analysez le site web de ce prospect pour detecter les problemes potentiels.
              </p>
              <Button onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Lancer l&apos;analyse
              </Button>
            </CardContent>
          </Card>
        )}

        {!prospect.url && (
          <Card>
            <CardHeader>
              <CardTitle>Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ce prospect n&apos;a pas de site web renseigne. Ajoutez-en un via le bouton Modifier pour lancer une analyse.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Analysis Results */}
      {prospect.analysis && (
        <AnalysisCard analysis={prospect.analysis} />
      )}

      {/* Email Draft */}
      {prospect.analysis && (
        <EmailDraft
          prospectId={prospect.id}
          prospectEmail={prospect.email}
          draft={prospect.draft}
          onDraftUpdated={fetchProspect}
        />
      )}
    </div>
  );
}
