import type { AnalysisResult } from '@/types';

// Plus le score est HAUT, plus le site est OBSOLÈTE (cible idéale)
export function calculateObsoleteScore(analysis: AnalysisResult): number {
  let score = 0;

  // HTTPS check (25 points si pas HTTPS)
  if (!analysis.httpsValid) {
    score += 25;
  }

  // Viewport check (25 points si pas de viewport)
  if (!analysis.hasViewport) {
    score += 25;
  }

  // Performance check (jusqu'à 25 points)
  if (analysis.ttfbMs > 2000) {
    score += 25;
  } else if (analysis.ttfbMs > 1000) {
    score += 15;
  } else if (analysis.ttfbMs > 500) {
    score += 10;
  }

  // Technologies obsolètes (10 points par tech, max 25)
  const techScore = Math.min(analysis.obsoleteTech.length * 10, 25);
  score += techScore;

  // Bonus si utilise des frameworks modernes (-10 points)
  const modernFrameworks = ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte'];
  const hasModernFramework = analysis.technologies.some((tech) =>
    modernFrameworks.some((fw) => tech.includes(fw))
  );
  if (hasModernFramework) {
    score = Math.max(0, score - 10);
  }

  return Math.min(score, 100);
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
    points: analysis.httpsValid ? 0 : 25,
    maxPoints: 25,
    issue: analysis.httpsValid ? null : 'Site non sécurisé (HTTP)',
  });

  // Viewport
  breakdown.push({
    criterion: 'Responsive Design',
    points: analysis.hasViewport ? 0 : 25,
    maxPoints: 25,
    issue: analysis.hasViewport ? null : 'Pas de viewport meta tag',
  });

  // Performance
  let perfPoints = 0;
  let perfIssue: string | null = null;
  if (analysis.ttfbMs > 2000) {
    perfPoints = 25;
    perfIssue = `TTFB très lent (${analysis.ttfbMs}ms)`;
  } else if (analysis.ttfbMs > 1000) {
    perfPoints = 15;
    perfIssue = `TTFB lent (${analysis.ttfbMs}ms)`;
  } else if (analysis.ttfbMs > 500) {
    perfPoints = 10;
    perfIssue = `TTFB acceptable (${analysis.ttfbMs}ms)`;
  }
  breakdown.push({
    criterion: 'Performance',
    points: perfPoints,
    maxPoints: 25,
    issue: perfIssue,
  });

  // Technologies obsolètes
  const techPoints = Math.min(analysis.obsoleteTech.length * 10, 25);
  breakdown.push({
    criterion: 'Technologies',
    points: techPoints,
    maxPoints: 25,
    issue: analysis.obsoleteTech.length > 0 ? analysis.obsoleteTech.join(', ') : null,
  });

  return breakdown;
}
