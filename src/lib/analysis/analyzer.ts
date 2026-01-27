import { checkHttps } from './checks/https';
import { checkViewport } from './checks/viewport';
import { checkPerformance } from './checks/performance';
import { checkStack } from './checks/stack';
import { calculateObsoleteScore } from './score';
import type { AnalysisResult } from '@/types';

export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
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

  // Run all checks in parallel
  const [httpsResult, viewportResult, performanceResult, stackResult] = await Promise.all([
    checkHttps(normalizedUrl),
    checkViewport(normalizedUrl, html),
    checkPerformance(normalizedUrl),
    checkStack(normalizedUrl, html, headers),
  ]);

  const result: AnalysisResult = {
    httpsValid: httpsResult.valid,
    hasViewport: viewportResult.hasViewport,
    ttfbMs: performanceResult.ttfbMs,
    technologies: stackResult.technologies,
    obsoleteTech: stackResult.obsoleteTech,
    rawData: {
      https: httpsResult,
      viewport: viewportResult,
      performance: performanceResult,
      stack: stackResult,
      analyzedUrl: normalizedUrl,
      timestamp: Date.now(),
    },
  };

  return result;
}

export { calculateObsoleteScore };
