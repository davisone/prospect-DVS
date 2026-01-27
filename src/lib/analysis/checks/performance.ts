export interface PerformanceCheckResult {
  ttfbMs: number;
  totalLoadTimeMs: number;
  success: boolean;
}

export async function checkPerformance(url: string): Promise<PerformanceCheckResult> {
  try {
    const startTime = performance.now();

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SmartDetection/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const ttfbTime = performance.now();

    // Read the body to get total load time
    await response.text();

    const endTime = performance.now();

    return {
      ttfbMs: Math.round(ttfbTime - startTime),
      totalLoadTimeMs: Math.round(endTime - startTime),
      success: response.ok,
    };
  } catch (error) {
    return {
      ttfbMs: 99999,
      totalLoadTimeMs: 99999,
      success: false,
    };
  }
}
