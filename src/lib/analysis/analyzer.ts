import { checkHttps } from './checks/https';
import { checkViewport } from './checks/viewport';
import { checkPerformance } from './checks/performance';
import { checkStack } from './checks/stack';
import { checkDesign, type DesignCheckResult } from './checks/design';
import { extractEmails, type EmailExtractionResult } from './checks/email';
import { calculateObsoleteScore } from './score';
import type { AnalysisResult } from '@/types';

export interface AnalysisResultWithEmail extends AnalysisResult {
  emailExtraction?: EmailExtractionResult;
}

export async function analyzeWebsite(url: string, options?: { extractEmail?: boolean }): Promise<AnalysisResultWithEmail> {
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Fetch HTML once for multiple checks
  let html: string | undefined;
  let headers: Headers | undefined;

  try {
    const response = await fetch(normalizedUrl, {
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    html = await response.text();
    headers = response.headers;
  } catch (error) {
    // Continue with individual checks
  }

  // Run all checks in parallel (including email extraction if requested)
  const shouldExtractEmail = options?.extractEmail !== false; // Par défaut, on extrait les emails

  const [httpsResult, viewportResult, performanceResult, stackResult, designResult, emailResult] = await Promise.all([
    checkHttps(normalizedUrl),
    checkViewport(normalizedUrl, html),
    checkPerformance(normalizedUrl),
    checkStack(normalizedUrl, html, headers),
    checkDesign(normalizedUrl, html),
    shouldExtractEmail ? extractEmails(normalizedUrl, html) : Promise.resolve(null),
  ]);

  const result: AnalysisResultWithEmail = {
    httpsValid: httpsResult.valid,
    hasViewport: viewportResult.hasViewport,
    ttfbMs: performanceResult.ttfbMs,
    technologies: stackResult.technologies,
    obsoleteTech: stackResult.obsoleteTech,
    designScore: designResult.score,
    designIssues: designResult.issues,
    designPositives: designResult.positives,
    designSummary: designResult.summary,
    rawData: {
      https: httpsResult,
      viewport: viewportResult,
      performance: performanceResult,
      stack: stackResult,
      design: designResult,
      analyzedUrl: normalizedUrl,
      timestamp: Date.now(),
    },
  };

  // Ajouter les résultats d'extraction d'email si disponibles
  if (emailResult) {
    result.emailExtraction = emailResult;
  }

  return result;
}

export { calculateObsoleteScore };
