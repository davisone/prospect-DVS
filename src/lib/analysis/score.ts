import type { AnalysisResult } from '@/types';

// Plus le score est HAUT, plus le site est OBSOLÈTE (cible idéale)
// Score max: 100 points répartis entre technique (50%) et design/UX (50%)
export function calculateObsoleteScore(analysis: AnalysisResult): number {
  let technicalScore = 0;
  let designScore = 0;

  // === SCORE TECHNIQUE (50 points max) ===

  // HTTPS check (12 points si pas HTTPS)
  if (!analysis.httpsValid) {
    technicalScore += 12;
  }

  // Viewport check (12 points si pas de viewport)
  if (!analysis.hasViewport) {
    technicalScore += 12;
  }

  // Performance check (jusqu'à 13 points)
  if (analysis.ttfbMs > 2000) {
    technicalScore += 13;
  } else if (analysis.ttfbMs > 1000) {
    technicalScore += 8;
  } else if (analysis.ttfbMs > 500) {
    technicalScore += 5;
  }

  // Technologies obsolètes (jusqu'à 13 points)
  const techScore = Math.min(analysis.obsoleteTech.length * 5, 13);
  technicalScore += techScore;

  // Bonus si utilise des frameworks modernes (-5 points)
  const modernFrameworks = ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte'];
  const hasModernFramework = analysis.technologies.some((tech) =>
    modernFrameworks.some((fw) => tech.includes(fw))
  );
  if (hasModernFramework) {
    technicalScore = Math.max(0, technicalScore - 5);
  }

  // === SCORE DESIGN/UX (50 points max) ===

  // Le designScore de l'analyse est sur 100, on le ramène à 50
  if (analysis.designScore !== undefined && analysis.designScore !== null) {
    designScore = Math.round(analysis.designScore / 2);
  }

  const totalScore = technicalScore + designScore;
  return Math.min(totalScore, 100);
}

export function getScoreCategory(score: number): {
  label: string;
  description: string;
  color: string;
} {
  if (score >= 70) {
    return {
      label: 'Cible prioritaire',
      description: 'Site très obsolète, excellent potentiel de prospection',
      color: 'green',
    };
  } else if (score >= 50) {
    return {
      label: 'Bon potentiel',
      description: 'Site avec plusieurs problèmes, bon candidat',
      color: 'yellow',
    };
  } else if (score >= 30) {
    return {
      label: 'Potentiel moyen',
      description: 'Quelques améliorations possibles',
      color: 'orange',
    };
  } else {
    return {
      label: 'Faible priorité',
      description: 'Site relativement moderne',
      color: 'red',
    };
  }
}

export function getScoreBreakdown(analysis: AnalysisResult): Array<{
  criterion: string;
  points: number;
  maxPoints: number;
  issue: string | null;
}> {
  const breakdown = [];

  // HTTPS
  breakdown.push({
    criterion: 'Sécurité HTTPS',
    points: analysis.httpsValid ? 0 : 12,
    maxPoints: 12,
    issue: analysis.httpsValid ? null : 'Site non sécurisé (HTTP)',
  });

  // Viewport
  breakdown.push({
    criterion: 'Responsive Design',
    points: analysis.hasViewport ? 0 : 12,
    maxPoints: 12,
    issue: analysis.hasViewport ? null : 'Pas de viewport meta tag',
  });

  // Performance
  let perfPoints = 0;
  let perfIssue: string | null = null;
  if (analysis.ttfbMs > 2000) {
    perfPoints = 13;
    perfIssue = `TTFB très lent (${analysis.ttfbMs}ms)`;
  } else if (analysis.ttfbMs > 1000) {
    perfPoints = 8;
    perfIssue = `TTFB lent (${analysis.ttfbMs}ms)`;
  } else if (analysis.ttfbMs > 500) {
    perfPoints = 5;
    perfIssue = `TTFB acceptable (${analysis.ttfbMs}ms)`;
  }
  breakdown.push({
    criterion: 'Performance',
    points: perfPoints,
    maxPoints: 13,
    issue: perfIssue,
  });

  // Technologies obsolètes
  const techPoints = Math.min(analysis.obsoleteTech.length * 5, 13);
  breakdown.push({
    criterion: 'Technologies',
    points: techPoints,
    maxPoints: 13,
    issue: analysis.obsoleteTech.length > 0 ? analysis.obsoleteTech.join(', ') : null,
  });

  // Design/UX
  const designPoints = analysis.designScore !== undefined && analysis.designScore !== null
    ? Math.round(analysis.designScore / 2)
    : 0;
  const designIssues = analysis.designIssues || [];
  const highSeverityIssues = designIssues.filter(i => i.severity === 'high');
  breakdown.push({
    criterion: 'Design & UX',
    points: designPoints,
    maxPoints: 50,
    issue: analysis.designSummary || (highSeverityIssues.length > 0
      ? highSeverityIssues.map(i => i.description).join(', ')
      : null),
  });

  return breakdown;
}
