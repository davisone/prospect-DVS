'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Clock, Save, Loader2 } from 'lucide-react';
import type { EmailDraft as EmailDraftType } from '@/types';

interface EmailDraftProps {
  prospectId: string;
  prospectEmail?: string | null;
  draft?: EmailDraftType | null;
  onDraftUpdated: () => void;
}

export function EmailDraft({ prospectId, prospectEmail, draft, onDraftUpdated }: EmailDraftProps) {
  const [subject, setSubject] = useState(draft?.subject || '');
  const [body, setBody] = useState(draft?.body || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubject(data.draft.subject);
        setBody(data.draft.body);
        setMessage({ type: 'success', text: 'Email généré avec succès' });
        onDraftUpdated();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur de génération' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft?.id) return;

    setSaving(true);
    try {
      const response = await fetch('/api/generate-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id, subject, body }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Brouillon sauvegardé' });
      } else {
        setMessage({ type: 'error', text: 'Erreur de sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!draft?.id || !prospectEmail) return;

    if (!confirm(`Envoyer l'email à ${prospectEmail} ?`)) return;

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId, draftId: draft.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email envoyé avec succès' });
        onDraftUpdated();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur d\'envoi' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSending(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!draft?.id) return;

    setQueueing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', prospectId, draftId: draft.id }),
      });

      const data = await response.json();

      if (response.ok) {
        const scheduledDate = new Date(data.scheduledAt).toLocaleString('fr-FR');
        setMessage({ type: 'success', text: `Ajouté à la file - envoi prévu le ${scheduledDate}` });
        onDraftUpdated();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setQueueing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Email de prospection</span>
          {!draft && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Générer avec IA
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!prospectEmail && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            Ce prospect n'a pas d'adresse email. L'envoi ne sera pas possible.
          </div>
        )}

        {draft ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="subject">Objet</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de l'email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Corps du message</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Contenu de l'email"
                rows={12}
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Régénérer
              </Button>

              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Sauvegarder
              </Button>

              <Button
                variant="outline"
                onClick={handleAddToQueue}
                disabled={queueing || !prospectEmail}
              >
                {queueing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                Ajouter à la file
              </Button>

              <Button onClick={handleSend} disabled={sending || !prospectEmail}>
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer maintenant
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Cliquez sur "Générer avec IA" pour créer un email personnalisé</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
