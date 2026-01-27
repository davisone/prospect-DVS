import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 bg-green-100';
  if (score >= 40) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-gray-600 bg-gray-100';
    case 'analyzed':
      return 'text-blue-600 bg-blue-100';
    case 'draft_ready':
      return 'text-purple-600 bg-purple-100';
    case 'queued':
      return 'text-orange-600 bg-orange-100';
    case 'sent':
      return 'text-green-600 bg-green-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'analyzed':
      return 'Analysé';
    case 'draft_ready':
      return 'Brouillon prêt';
    case 'queued':
      return 'En file';
    case 'sent':
      return 'Envoyé';
    default:
      return status;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(ms);
}
