export interface StackCheckResult {
  technologies: string[];
  obsoleteTech: string[];
  frameworks: string[];
  cms: string | null;
}

interface TechPattern {
  name: string;
  patterns: RegExp[];
  versionPattern?: RegExp;
  obsoleteIf?: (version: string) => boolean;
  category: 'framework' | 'library' | 'cms' | 'server';
}

const TECH_PATTERNS: TechPattern[] = [
  {
    name: 'jQuery',
    patterns: [/jquery[.-]?(\d+\.\d+\.\d+)?/i, /jquery\.min\.js/i],
    versionPattern: /jquery[.-]?(\d+\.\d+\.\d+)/i,
    obsoleteIf: (version) => {
      const major = parseInt(version.split('.')[0]);
      return major < 3;
    },
    category: 'library',
  },
  {
    name: 'React',
    patterns: [/react[.-]dom/i, /__REACT_DEVTOOLS/i, /react\.production/i],
    category: 'framework',
  },
  {
    name: 'Vue.js',
    patterns: [/vue\.js/i, /vue\.min\.js/i, /vue@\d/i, /__VUE__/i],
    category: 'framework',
  },
  {
    name: 'Angular',
    patterns: [/angular[.-]?core/i, /ng-version/i],
    category: 'framework',
  },
  {
    name: 'Next.js',
    patterns: [/_next\/static/i, /__NEXT_DATA__/i],
    category: 'framework',
  },
  {
    name: 'Nuxt.js',
    patterns: [/_nuxt\//i, /__NUXT__/i],
    category: 'framework',
  },
  {
    name: 'WordPress',
    patterns: [/wp-content/i, /wp-includes/i, /wordpress/i],
    versionPattern: /WordPress\s*(\d+\.\d+)/i,
    obsoleteIf: (version) => {
      const major = parseFloat(version);
      return major < 5;
    },
    category: 'cms',
  },
  {
    name: 'Joomla',
    patterns: [/joomla/i, /\/media\/system/i],
    category: 'cms',
  },
  {
    name: 'Drupal',
    patterns: [/drupal\.js/i, /\/sites\/all\/modules/i],
    category: 'cms',
  },
  {
    name: 'Bootstrap',
    patterns: [/bootstrap[.-]?(\d+\.\d+)?/i, /bootstrap\.min\.css/i],
    versionPattern: /bootstrap[.-]?(\d+\.\d+)/i,
    obsoleteIf: (version) => {
      const major = parseInt(version.split('.')[0]);
      return major < 4;
    },
    category: 'library',
  },
  {
    name: 'Tailwind CSS',
    patterns: [/tailwindcss/i, /tailwind\.css/i],
    category: 'library',
  },
  {
    name: 'PHP',
    patterns: [/\.php/i, /X-Powered-By:\s*PHP/i],
    category: 'server',
  },
  {
    name: 'ASP.NET',
    patterns: [/aspx/i, /X-AspNet-Version/i, /__VIEWSTATE/i],
    category: 'server',
  },
  {
    name: 'Express',
    patterns: [/X-Powered-By:\s*Express/i],
    category: 'server',
  },
  {
    name: 'Wix',
    patterns: [/wix\.com/i, /wixstatic\.com/i],
    category: 'cms',
  },
  {
    name: 'Squarespace',
    patterns: [/squarespace/i],
    category: 'cms',
  },
  {
    name: 'Shopify',
    patterns: [/shopify/i, /cdn\.shopify/i],
    category: 'cms',
  },
];

export async function checkStack(url: string, html?: string, headers?: Headers): Promise<StackCheckResult> {
  const technologies: string[] = [];
  const obsoleteTech: string[] = [];
  const frameworks: string[] = [];
  let cms: string | null = null;

  try {
    let htmlContent = html;
    let responseHeaders = headers;

    if (!htmlContent) {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SmartDetection/1.0)',
        },
      });
      htmlContent = await response.text();
      responseHeaders = response.headers;
    }

    // Combine HTML and headers for pattern matching
    const headersString = responseHeaders
      ? Array.from(responseHeaders.entries())
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : '';
    const searchContent = htmlContent + '\n' + headersString;

    for (const tech of TECH_PATTERNS) {
      let detected = false;
      let version: string | null = null;

      for (const pattern of tech.patterns) {
        if (pattern.test(searchContent)) {
          detected = true;
          break;
        }
      }

      if (detected) {
        // Try to extract version
        if (tech.versionPattern) {
          const versionMatch = searchContent.match(tech.versionPattern);
          if (versionMatch) {
            version = versionMatch[1];
          }
        }

        const techName = version ? `${tech.name} ${version}` : tech.name;
        technologies.push(techName);

        // Check if obsolete
        if (version && tech.obsoleteIf && tech.obsoleteIf(version)) {
          obsoleteTech.push(techName);
        }

        // Categorize
        if (tech.category === 'framework') {
          frameworks.push(tech.name);
        } else if (tech.category === 'cms' && !cms) {
          cms = tech.name;
        }
      }
    }

    // Check for outdated HTML patterns
    const outdatedPatterns = [
      { pattern: /<table[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?<table/i, name: 'Table-based layout' },
      { pattern: /<font[^>]*>/i, name: 'Font tags' },
      { pattern: /<center>/i, name: 'Center tags' },
      { pattern: /<marquee>/i, name: 'Marquee tags' },
      { pattern: /frameset/i, name: 'Framesets' },
      { pattern: /onclick\s*=/i, name: 'Inline event handlers' },
    ];

    for (const { pattern, name } of outdatedPatterns) {
      if (pattern.test(htmlContent)) {
        obsoleteTech.push(name);
      }
    }

  } catch (error) {
    // Return empty results on error
  }

  return {
    technologies: Array.from(new Set(technologies)),
    obsoleteTech: Array.from(new Set(obsoleteTech)),
    frameworks: Array.from(new Set(frameworks)),
    cms,
  };
}
