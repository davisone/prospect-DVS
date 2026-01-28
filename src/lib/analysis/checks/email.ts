/**
 * Module d'extraction d'emails depuis les sites web
 * Cherche les emails sur la page principale et les pages Contact/À propos
 */

export interface EmailExtractionResult {
  emails: string[];
  bestEmail: string | null;
  source: string | null; // URL où l'email a été trouvé
}

// Regex pour détecter les emails
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Emails à ignorer (génériques, spam traps, etc.)
const IGNORED_EMAILS = [
  'example@',
  'test@',
  'demo@',
  'noreply@',
  'no-reply@',
  'donotreply@',
  'mailer-daemon@',
  'postmaster@',
  'webmaster@',
  'hostmaster@',
  'abuse@',
  'spam@',
  'root@',
  'admin@example',
  'user@example',
  'email@example',
  'your@email',
  'name@domain',
  'votre@email',
  'nom@domaine',
];

// Domaines à ignorer (services, réseaux sociaux, etc.)
const IGNORED_DOMAINS = [
  'example.com',
  'example.fr',
  'domain.com',
  'email.com',
  'test.com',
  'sentry.io',
  'wixpress.com',
  'w3.org',
  'schema.org',
  'googleapis.com',
  'google.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'apple.com',
  'microsoft.com',
  'wordpress.org',
  'wordpress.com',
  'gravatar.com',
  'cloudflare.com',
];

// Patterns de liens vers pages de contact
const CONTACT_PAGE_PATTERNS = [
  /contact/i,
  /nous-contacter/i,
  /contactez-nous/i,
  /kontakt/i,
  /about/i,
  /a-propos/i,
  /qui-sommes-nous/i,
  /mentions-legales/i,
  /legal/i,
  /info/i,
  /equipe/i,
  /team/i,
];

// Priorité des emails (plus le score est bas, meilleur c'est)
function getEmailPriority(email: string): number {
  const lowerEmail = email.toLowerCase();

  // Emails directs (prénom, nom) = haute priorité
  if (/^[a-z]+\.[a-z]+@/i.test(email)) return 1;
  if (/^[a-z]+@/i.test(email) && !lowerEmail.startsWith('info') && !lowerEmail.startsWith('contact')) return 2;

  // Emails contact/info = priorité moyenne (mais utiles)
  if (lowerEmail.startsWith('contact@')) return 3;
  if (lowerEmail.startsWith('info@')) return 4;
  if (lowerEmail.startsWith('commercial@')) return 5;
  if (lowerEmail.startsWith('hello@')) return 5;
  if (lowerEmail.startsWith('bonjour@')) return 5;

  // Autres emails professionnels
  if (lowerEmail.startsWith('direction@')) return 6;
  if (lowerEmail.startsWith('accueil@')) return 6;
  if (lowerEmail.startsWith('service@')) return 7;

  return 10; // Priorité par défaut
}

/**
 * Extrait les emails d'un contenu HTML
 */
function extractEmailsFromHtml(html: string): string[] {
  // Décoder les entités HTML courantes
  const decodedHtml = html
    .replace(/&#64;/g, '@')
    .replace(/&#46;/g, '.')
    .replace(/\[at\]/gi, '@')
    .replace(/\[dot\]/gi, '.')
    .replace(/\(at\)/gi, '@')
    .replace(/\(dot\)/gi, '.')
    .replace(/ at /gi, '@')
    .replace(/ dot /gi, '.');

  const matches = decodedHtml.match(EMAIL_REGEX) || [];

  // Nettoyer et filtrer les emails
  const cleanedEmails = matches
    .map(email => email.toLowerCase().trim())
    .filter(email => {
      // Vérifier longueur minimale
      if (email.length < 6) return false;

      // Ignorer les emails dans les IGNORED_EMAILS
      if (IGNORED_EMAILS.some(ignored => email.startsWith(ignored))) return false;

      // Ignorer les domaines dans IGNORED_DOMAINS
      const domain = email.split('@')[1];
      if (IGNORED_DOMAINS.some(ignored => domain === ignored || domain.endsWith('.' + ignored))) return false;

      // Ignorer les emails avec des extensions de fichiers
      if (/\.(png|jpg|jpeg|gif|svg|css|js|json|xml|pdf|doc|zip)$/i.test(email)) return false;

      // Vérifier que le domaine a une extension valide
      if (!/\.[a-z]{2,}$/i.test(domain)) return false;

      return true;
    });

  // Dédupliquer
  return Array.from(new Set(cleanedEmails));
}

/**
 * Trouve les URLs des pages de contact potentielles
 */
function findContactPageUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const base = new URL(baseUrl);

  // Regex pour trouver les liens
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];

    // Vérifier si c'est un lien de contact
    const isContactPage = CONTACT_PAGE_PATTERNS.some(pattern => pattern.test(href));

    if (isContactPage) {
      try {
        // Construire l'URL complète
        let fullUrl: string;
        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('/')) {
          fullUrl = `${base.origin}${href}`;
        } else {
          fullUrl = `${base.origin}/${href}`;
        }

        // Ne garder que les URLs du même domaine
        const parsedUrl = new URL(fullUrl);
        if (parsedUrl.hostname === base.hostname) {
          urls.push(fullUrl);
        }
      } catch {
        // URL invalide, ignorer
      }
    }
  }

  // Dédupliquer et limiter
  return Array.from(new Set(urls)).slice(0, 5);
}

/**
 * Récupère le contenu d'une page
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return null;

    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Extrait les emails d'un site web
 * Cherche sur la page principale et les pages de contact
 */
export async function extractEmails(url: string, html?: string): Promise<EmailExtractionResult> {
  const result: EmailExtractionResult = {
    emails: [],
    bestEmail: null,
    source: null,
  };

  // Normaliser l'URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Map pour stocker emails et leur source
  const emailSources = new Map<string, string>();

  // 1. Chercher dans le HTML fourni (page principale)
  let mainHtml: string | null = html || null;
  if (!mainHtml) {
    mainHtml = await fetchPage(normalizedUrl);
  }

  if (mainHtml) {
    const mainEmails = extractEmailsFromHtml(mainHtml);
    mainEmails.forEach(email => emailSources.set(email, normalizedUrl));

    // 2. Trouver et explorer les pages de contact
    const contactUrls = findContactPageUrls(mainHtml, normalizedUrl);

    // Explorer les pages de contact en parallèle
    const contactPages = await Promise.all(
      contactUrls.map(async (contactUrl) => {
        const pageHtml = await fetchPage(contactUrl);
        return { url: contactUrl, html: pageHtml };
      })
    );

    // Extraire les emails des pages de contact
    for (const page of contactPages) {
      if (page.html) {
        const pageEmails = extractEmailsFromHtml(page.html);
        pageEmails.forEach(email => {
          if (!emailSources.has(email)) {
            emailSources.set(email, page.url);
          }
        });
      }
    }
  }

  // 3. Essayer aussi les URLs communes de contact
  const commonContactUrls = [
    `${normalizedUrl}/contact`,
    `${normalizedUrl}/contact.html`,
    `${normalizedUrl}/contact.php`,
    `${normalizedUrl}/nous-contacter`,
    `${normalizedUrl}/a-propos`,
  ];

  // Ne tester que les URLs pas encore visitées
  const urlsToTest = commonContactUrls.filter(u =>
    !Array.from(emailSources.values()).includes(u)
  ).slice(0, 3);

  const additionalPages = await Promise.all(
    urlsToTest.map(async (contactUrl) => {
      const pageHtml = await fetchPage(contactUrl);
      return { url: contactUrl, html: pageHtml };
    })
  );

  for (const page of additionalPages) {
    if (page.html) {
      const pageEmails = extractEmailsFromHtml(page.html);
      pageEmails.forEach(email => {
        if (!emailSources.has(email)) {
          emailSources.set(email, page.url);
        }
      });
    }
  }

  // Compiler les résultats
  result.emails = Array.from(emailSources.keys());

  // Trouver le meilleur email
  if (result.emails.length > 0) {
    // Trier par priorité
    const sortedEmails = result.emails.sort((a, b) =>
      getEmailPriority(a) - getEmailPriority(b)
    );

    result.bestEmail = sortedEmails[0];
    result.source = emailSources.get(result.bestEmail) || null;
  }

  return result;
}