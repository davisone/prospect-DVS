export interface ViewportCheckResult {
  hasViewport: boolean;
  viewportContent: string | null;
  isMobileFriendly: boolean;
}

export async function checkViewport(url: string, html?: string): Promise<ViewportCheckResult> {
  try {
    let htmlContent = html;

    if (!htmlContent) {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SmartDetection/1.0)',
        },
      });
      htmlContent = await response.text();
    }

    // Check for viewport meta tag
    const viewportRegex = /<meta[^>]*name=["']viewport["'][^>]*>/i;
    const viewportMatch = htmlContent.match(viewportRegex);

    if (!viewportMatch) {
      return {
        hasViewport: false,
        viewportContent: null,
        isMobileFriendly: false,
      };
    }

    // Extract content attribute
    const contentRegex = /content=["']([^"']*)["']/i;
    const contentMatch = viewportMatch[0].match(contentRegex);
    const viewportContent = contentMatch ? contentMatch[1] : null;

    // Check if viewport is properly configured for mobile
    const isMobileFriendly = viewportContent
      ? viewportContent.includes('width=device-width') || viewportContent.includes('initial-scale')
      : false;

    return {
      hasViewport: true,
      viewportContent,
      isMobileFriendly,
    };
  } catch (error) {
    return {
      hasViewport: false,
      viewportContent: null,
      isMobileFriendly: false,
    };
  }
}
