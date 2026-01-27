export interface HttpsCheckResult {
  valid: boolean;
  redirectsToHttps: boolean;
  originalUrl: string;
  finalUrl: string;
}

export async function checkHttps(url: string): Promise<HttpsCheckResult> {
  try {
    // Ensure URL starts with http or https
    let testUrl = url;
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = `http://${testUrl}`;
    }

    const response = await fetch(testUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    const finalUrl = response.url;
    const isHttps = finalUrl.startsWith('https://');
    const redirectedToHttps = testUrl.startsWith('http://') && isHttps;

    return {
      valid: isHttps,
      redirectsToHttps: redirectedToHttps,
      originalUrl: testUrl,
      finalUrl,
    };
  } catch (error) {
    // Try HTTPS directly if HTTP failed
    try {
      const httpsUrl = url.replace(/^http:\/\//, 'https://');
      const testUrl = httpsUrl.startsWith('https://') ? httpsUrl : `https://${url}`;

      const response = await fetch(testUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      return {
        valid: true,
        redirectsToHttps: false,
        originalUrl: url,
        finalUrl: response.url,
      };
    } catch {
      return {
        valid: false,
        redirectsToHttps: false,
        originalUrl: url,
        finalUrl: url,
      };
    }
  }
}
