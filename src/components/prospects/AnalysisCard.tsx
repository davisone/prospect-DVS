'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, Clock, Shield, Smartphone, Zap, Code } from 'lucide-react';
import type { Analysis } from '@/types';

interface AnalysisCardProps {
  analysis: Analysis;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const technologies = typeof analysis.technologies === 'string'
    ? JSON.parse(analysis.technologies)
    : analysis.technologies;
  const obsoleteTech = typeof analysis.obsoleteTech === 'string'
    ? JSON.parse(analysis.obsoleteTech)
    : analysis.obsoleteTech;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Cible prioritaire';
    if (score >= 50) return 'Bon potentiel';
    if (score >= 30) return 'Potentiel moyen';
    return 'Faible priorité';
  };

  const checks = [
    {
      name: 'HTTPS',
      icon: Shield,
      passed: analysis.httpsValid,
      description: analysis.httpsValid ? 'Site sécurisé' : 'Site non sécurisé (HTTP)',
      points: analysis.httpsValid ? 0 : 25,
    },
    {
      name: 'Mobile',
      icon: Smartphone,
      passed: analysis.hasViewport,
      description: analysis.hasViewport ? 'Responsive' : 'Non responsive',
      points: analysis.hasViewport ? 0 : 25,
    },
    {
      name: 'Performance',
      icon: Zap,
      passed: analysis.ttfbMs < 1000,
      description: `TTFB: ${analysis.ttfbMs}ms`,
      points: analysis.ttfbMs > 2000 ? 25 : analysis.ttfbMs > 1000 ? 15 : analysis.ttfbMs > 500 ? 10 : 0,
    },
    {
      name: 'Technologies',
      icon: Code,
      passed: obsoleteTech.length === 0,
      description: obsoleteTech.length > 0 ? `${obsoleteTech.length} tech obsolète(s)` : 'Stack moderne',
      points: Math.min(obsoleteTech.length * 10, 25),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analyse de vétusté</span>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}/100
            </div>
            <div className="text-sm text-muted-foreground">{getScoreLabel(analysis.score)}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={analysis.score} className="h-3" />

        <div className="grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check.name}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                check.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className={`mt-0.5 ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                {check.passed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <check.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{check.name}</span>
                  </div>
                  {check.points > 0 && (
                    <Badge variant="secondary">+{check.points} pts</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{check.description}</p>
              </div>
            </div>
          ))}
        </div>

        {technologies.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Technologies détectées</h4>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech: string) => (
                <Badge
                  key={tech}
                  variant={obsoleteTech.includes(tech) ? 'destructive' : 'secondary'}
                >
                  {tech}
                  {obsoleteTech.includes(tech) && ' (obsolète)'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {obsoleteTech.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Points d'amélioration</p>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                {obsoleteTech.map((tech: string) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
