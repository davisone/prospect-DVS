import OpenAI from 'openai';

export interface DesignCheckResult {
  score: number; // 0-100, plus c'est haut plus c'est "moche"/obsolète
  issues: DesignIssue[];
  positives: string[];
  summary: string;
}

export interface DesignIssue {
  category: 'visual' | 'ux' | 'structure' | 'accessibility';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

const DESIGN_ANALYSIS_PROMPT = `Tu es un expert UX/UI designer. Analyse ce code HTML d'un site web et évalue sa qualité visuelle et son expérience utilisateur.

Évalue ces critères et attribue un score d'obsolescence de 0 à 100 (0 = design moderne et pro, 100 = design très daté et amateur) :

1. DESIGN VISUEL (0-25 points si problèmes)
   - Design daté années 2000-2010 (gradients lourds, ombres excessives, effets 3D)
   - Couleurs criardes, mal assorties ou trop nombreuses
   - Typographie amateur (Comic Sans, papyrus, polices fantaisie)
   - Mise en page chaotique sans grille visuelle
   - Images pixelisées ou de mauvaise qualité
   - GIFs animés, compteurs de visites, cliparts

2. EXPÉRIENCE UTILISATEUR (0-25 points si problèmes)
   - Navigation confuse ou trop profonde
   - Pas de call-to-action clairs
   - Informations importantes difficiles à trouver
   - Formulaires mal conçus
   - Liens non évidents (pas soulignés, mauvaise couleur)
   - Menus déroulants complexes

3. STRUCTURE ET LISIBILITÉ (0-25 points si problèmes)
   - Pas de hiérarchie visuelle (tout au même niveau)
   - Blocs de texte trop longs sans espacement
   - Contraste insuffisant texte/fond
   - Trop d'informations sur une seule page
   - Pas d'espaces blancs (page surchargée)
   - Absence de sections distinctes

4. MODERNITÉ ET STANDARDS (0-25 points si problèmes)
   - Pas de balises sémantiques (header, nav, main, footer, article)
   - Utilisation de tableaux pour la mise en page
   - Styles inline au lieu de CSS séparé
   - Pas de cohérence visuelle entre les sections
   - Absence de design system (boutons différents partout)
   - Flash, Java applets, ou technologies abandonnées

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "score": <number 0-100>,
  "issues": [
    {
      "category": "<visual|ux|structure|accessibility>",
      "severity": "<high|medium|low>",
      "description": "<description courte en français>"
    }
  ],
  "positives": ["<point positif en français>"],
  "summary": "<résumé en 1 phrase de l'état général du site en français>"
}

Si le HTML est trop court ou vide, retourne un score de 50 avec un résumé approprié.`;

function extractRelevantHTML(html: string): string {
  // Extraire les parties pertinentes pour l'analyse design
  // On limite à ~15000 caractères pour rester dans les limites de tokens

  // Supprimer les scripts et styles inline volumineux
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '[CSS]')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Garder la structure mais limiter
  if (cleaned.length > 15000) {
    // Prendre le head et le début du body
    const headMatch = cleaned.match(/<head[\s\S]*?<\/head>/i);
    const bodyMatch = cleaned.match(/<body[\s\S]*$/i);

    const head = headMatch ? headMatch[0].substring(0, 3000) : '';
    const body = bodyMatch ? bodyMatch[0].substring(0, 12000) : cleaned.substring(0, 12000);

    cleaned = head + '\n...\n' + body;
  }

  return cleaned;
}

function detectObviousIssues(html: string): DesignIssue[] {
  const issues: DesignIssue[] = [];

  // Détection de patterns visuellement datés sans IA
  const patterns = [
    {
      regex: /<blink\b/i,
      issue: { category: 'visual' as const, severity: 'high' as const, description: 'Utilisation de balises blink (années 90)' }
    },
    {
      regex: /<marquee\b/i,
      issue: { category: 'visual' as const, severity: 'high' as const, description: 'Texte défilant marquee (très daté)' }
    },
    {
      regex: /Comic\s*Sans/i,
      issue: { category: 'visual' as const, severity: 'high' as const, description: 'Police Comic Sans (non professionnelle)' }
    },
    {
      regex: /Papyrus|Curlz|Jokerman/i,
      issue: { category: 'visual' as const, severity: 'high' as const, description: 'Police fantaisie non professionnelle' }
    },
    {
      regex: /background\s*=\s*["'][^"']*\.gif["']/i,
      issue: { category: 'visual' as const, severity: 'medium' as const, description: 'Image de fond GIF animée' }
    },
    {
      regex: /<img[^>]*\.gif[^>]*>/gi,
      issue: { category: 'visual' as const, severity: 'low' as const, description: 'Nombreuses images GIF' },
      countThreshold: 5
    },
    {
      regex: /visitor\s*count|compteur\s*de\s*visite|hit\s*counter/i,
      issue: { category: 'visual' as const, severity: 'high' as const, description: 'Compteur de visites (très daté)' }
    },
    {
      regex: /under\s*construction|en\s*construction|travaux/i,
      issue: { category: 'ux' as const, severity: 'medium' as const, description: 'Page "en construction"' }
    },
    {
      regex: /<frame\b|<frameset\b/i,
      issue: { category: 'structure' as const, severity: 'high' as const, description: 'Utilisation de frames (obsolète)' }
    },
    {
      regex: /bgcolor\s*=|background\s*=/i,
      issue: { category: 'structure' as const, severity: 'medium' as const, description: 'Attributs HTML de style inline (pratique obsolète)' }
    },
    {
      regex: /<center\b/i,
      issue: { category: 'structure' as const, severity: 'medium' as const, description: 'Balises center (HTML4 obsolète)' }
    },
    {
      regex: /<font\b/i,
      issue: { category: 'structure' as const, severity: 'medium' as const, description: 'Balises font (HTML4 obsolète)' }
    },
    {
      regex: /<table[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?<table/i,
      issue: { category: 'structure' as const, severity: 'high' as const, description: 'Mise en page avec tableaux imbriqués' }
    },
    {
      regex: /Flash\s*Player|\.swf|object\s*type\s*=\s*["']application\/x-shockwave/i,
      issue: { category: 'visual' as const, severity: 'high' as const, description: 'Contenu Flash (technologie abandonnée)' }
    },
  ];

  for (const { regex, issue, countThreshold } of patterns) {
    if (countThreshold) {
      const matches = html.match(regex);
      if (matches && matches.length >= countThreshold) {
        issues.push(issue);
      }
    } else if (regex.test(html)) {
      issues.push(issue);
    }
  }

  // Vérifier l'absence de balises sémantiques
  const hasSemanticTags = /<(header|nav|main|footer|article|section)\b/i.test(html);
  if (!hasSemanticTags && html.length > 1000) {
    issues.push({
      category: 'structure',
      severity: 'medium',
      description: 'Absence de balises HTML5 sémantiques'
    });
  }

  // Vérifier la présence d'une navigation claire
  const hasNav = /<nav\b/i.test(html) || /class\s*=\s*["'][^"']*nav/i.test(html) || /id\s*=\s*["'][^"']*nav/i.test(html);
  if (!hasNav && html.length > 1000) {
    issues.push({
      category: 'ux',
      severity: 'low',
      description: 'Navigation non clairement identifiée'
    });
  }

  return issues;
}

export async function checkDesign(url: string, html?: string): Promise<DesignCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Résultat par défaut si pas d'API key ou erreur
  const defaultResult: DesignCheckResult = {
    score: 0,
    issues: [],
    positives: [],
    summary: 'Analyse design non disponible'
  };

  let htmlContent = html;

  if (!htmlContent) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      htmlContent = await response.text();
    } catch {
      return defaultResult;
    }
  }

  // Détection rapide des problèmes évidents (sans IA)
  const obviousIssues = detectObviousIssues(htmlContent);

  // Si pas d'API key, retourner juste les problèmes évidents
  if (!apiKey) {
    const quickScore = Math.min(obviousIssues.length * 15, 60);
    return {
      score: quickScore,
      issues: obviousIssues,
      positives: [],
      summary: obviousIssues.length > 0
        ? `${obviousIssues.length} problème(s) de design détecté(s)`
        : 'Analyse IA non disponible (pas de clé API)'
    };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const relevantHTML = extractRelevantHTML(htmlContent);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DESIGN_ANALYSIS_PROMPT },
        { role: 'user', content: `URL: ${url}\n\nHTML:\n${relevantHTML}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Pas de réponse de l\'IA');
    }

    const aiResult = JSON.parse(content) as DesignCheckResult;

    // Combiner les problèmes évidents avec l'analyse IA
    const allIssues = [...obviousIssues];
    for (const issue of aiResult.issues) {
      // Éviter les doublons
      if (!allIssues.some(i => i.description.toLowerCase().includes(issue.description.toLowerCase().slice(0, 20)))) {
        allIssues.push(issue);
      }
    }

    return {
      score: Math.min(aiResult.score + (obviousIssues.length * 5), 100),
      issues: allIssues,
      positives: aiResult.positives || [],
      summary: aiResult.summary
    };

  } catch (error) {
    // En cas d'erreur IA, retourner les problèmes évidents
    const quickScore = Math.min(obviousIssues.length * 15, 60);
    return {
      score: quickScore,
      issues: obviousIssues,
      positives: [],
      summary: obviousIssues.length > 0
        ? `${obviousIssues.length} problème(s) de design détecté(s)`
        : 'Analyse design non concluante'
    };
  }
}