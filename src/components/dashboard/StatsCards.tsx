'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, Mail, Send, Clock, MailCheck } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    totalProspects: number;
    withEmailCount: number;
    analyzedCount: number;
    draftReadyCount: number;
    queuedCount: number;
    sentCount: number;
    averageScore: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Prospects',
      value: stats.totalProspects,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Avec email',
      value: stats.withEmailCount,
      subtitle: `${stats.totalProspects > 0 ? Math.round((stats.withEmailCount / stats.totalProspects) * 100) : 0}%`,
      icon: MailCheck,
      color: 'text-green-600',
    },
    {
      title: 'Analysés',
      value: stats.analyzedCount,
      icon: Search,
      color: 'text-purple-600',
    },
    {
      title: 'En file',
      value: stats.queuedCount,
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Envoyés',
      value: stats.sentCount,
      icon: Send,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {'subtitle' in card && card.subtitle && (
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
