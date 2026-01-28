import OpenAI from 'openai';
import type { ProspectWithAnalysis } from '@/types';
import { getScoreBreakdown } from '../analysis/score';

const SYSTEM_PROMPT = `Tu es un expert en rédaction de mails de prospection B2B pour DVS Web, une agence web qui aide les entreprises locales à avoir un site internet moderne qui attire des clients.

IMPORTANT - Le destinataire n'est PAS un professionnel du web. Il ne comprend pas le jargon technique.

Règles strictes :
- JAMAIS de termes techniques (pas de "HTTPS", "responsive", "viewport", "TTFB", "jQuery", "WordPress", etc.)
- Parle en termes de CONSÉQUENCES CONCRÈTES pour son business :
  • Site lent = clients qui partent avant de voir les produits/services
  • Pas adapté mobile = 60% des visiteurs ne peuvent pas naviguer correctement
  • Site pas sécurisé = Google le pénalise et les clients ne font pas confiance
  • Design vieillot = mauvaise image de marque
- Mentionne aussi ce qui est BIEN sur son site si applicable
- Explique ce que DVS Web peut lui apporter : plus de clients, meilleure image, site qui inspire confiance
- Sois chaleureux, humain et local (on est une agence de proximité)
- Utilise le vouvoiement
p- Max 120 mots pour le corps du message (avant la signature)
- Termine par une question simple et ouverte

SIGNATURE OBLIGATOIRE (à ajouter à la fin du body, exactement comme ceci) :

L'équipe DVS Web
06 51 01 95 06
https://dvs-web.fr

Tu dois répondre en JSON avec ce format exact :
{
  "subject": "Objet du mail (court, accrocheur, PAS technique)",
  "body": "Corps du mail avec la signature complète à la fin"
}`;

// Parse une valeur qui peut être un tableau, une chaîne JSON, ou une chaîne simple
function safeParseArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Si ça commence par '[', c'est probablement du JSON
    if (value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    // Sinon c'est une chaîne simple (ex: "jQuery,WordPress")
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Parse une chaîne JSON ou retourne le tableau tel quel
function safeParseDesignIssues(value: unknown): Array<{ category: string; severity: string; description: string }> {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function buildUserPrompt(prospect: ProspectWithAnalysis): string {
  const problems: string[] = [];
  const positives: string[] = [];

  if (prospect.analysis) {
    // Sécurité (HTTPS)
    if (!prospect.analysis.httpsValid) {
      problems.push("Le site n'est pas sécurisé - les visiteurs voient un avertissement 'Non sécurisé' dans leur navigateur, ce qui fait fuir les clients");
    } else {
      positives.push("Le site est sécurisé (cadenas vert)");
    }

    // Mobile (viewport)
    if (!prospect.analysis.hasViewport) {
      problems.push("Le site ne s'affiche pas correctement sur téléphone - or 60% des gens naviguent sur mobile");
    } else {
      positives.push("Le site s'adapte aux téléphones");
    }

    // Performance (TTFB)
    if (prospect.analysis.ttfbMs > 2000) {
      problems.push("Le site est très lent à charger - les visiteurs partent avant même de voir le contenu");
    } else if (prospect.analysis.ttfbMs > 1000) {
      problems.push("Le site met du temps à charger - chaque seconde d'attente fait perdre des clients potentiels");
    } else {
      positives.push("Le site se charge rapidement");
    }

    // Technologies obsolètes
    const obsoleteTech = safeParseArray(prospect.analysis.obsoleteTech);
    if (obsoleteTech.length > 0) {
      problems.push("Le site utilise des technologies datées - cela peut causer des problèmes d'affichage et de sécurité");
    }

    // Design et UX (nouveaux critères)
    const designScore = prospect.analysis.designScore;
    const designIssues = safeParseDesignIssues(prospect.analysis.designIssues);
    const designSummary = prospect.analysis.designSummary;

    if (designScore !== null && designScore !== undefined) {
      // Problèmes de design visuels
      const visualIssues = designIssues.filter(i => i.category === 'visual' && i.severity === 'high');
      if (visualIssues.length > 0) {
        problems.push("Le design du site fait daté - les visiteurs associent l'apparence du site à la qualité de l'entreprise");
      }

      // Problèmes d'expérience utilisateur
      const uxIssues = designIssues.filter(i => i.category === 'ux' && (i.severity === 'high' || i.severity === 'medium'));
      if (uxIssues.length > 0) {
        problems.push("La navigation sur le site n'est pas intuitive - les visiteurs peinent à trouver ce qu'ils cherchent et abandonnent");
      }

      // Problèmes de structure/lisibilité
      const structureIssues = designIssues.filter(i => i.category === 'structure' && i.severity === 'high');
      if (structureIssues.length > 0) {
        problems.push("La présentation des informations est confuse - les clients potentiels ne voient pas clairement vos services");
      }

      // Score design élevé = site moche
      if (designScore >= 60) {
        problems.push("L'aspect général du site ne met pas en valeur le professionnalisme de l'entreprise");
      } else if (designScore >= 40 && visualIssues.length === 0) {
        problems.push("Le site mériterait un rafraîchissement visuel pour mieux correspondre aux standards actuels");
      } else if (designScore < 30 && designIssues.length === 0) {
        positives.push("Le site a un design plutôt soigné");
      }
    }

    // Score global (si très élevé et pas déjà mentionné)
    const score = prospect.analysis.score || 0;
    if (score >= 70 && problems.length < 3) {
      problems.push("De manière générale, le site fait vraiment daté et ne reflète probablement pas la qualité de l'entreprise");
    }
  }

  return `Génère un email de prospection pour cette entreprise :

Nom de l'entreprise : ${prospect.name}
Ville : ${prospect.city || 'Non spécifiée'}
Site web : ${prospect.url || 'Non spécifié'}

Ce qui va BIEN sur leur site :
${positives.length > 0 ? positives.map((p) => `- ${p}`).join('\n') : '- Rien de particulier à noter'}

Ce qui pose PROBLÈME (en termes d'impact business) :
${problems.length > 0 ? problems.map((p) => `- ${p}`).join('\n') : '- Le site est globalement correct'}

Ce que DVS Web peut leur apporter :
- Un site moderne qui inspire confiance aux visiteurs
- Une meilleure visibilité sur Google
- Plus de clients grâce à un site qui convertit
- Un site qui reflète vraiment la qualité de leur travail

Génère un email chaleureux et personnalisé. Ne liste pas tous les problèmes, choisis les 1-2 plus importants.`;
}

export async function generateEmail(
  prospect: ProspectWithAnalysis
): Promise<{ subject: string; body: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(prospect) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);

  // S'assurer que la signature est présente
  const signature = `\n\nL'équipe DVS Web\n06 51 01 95 06\nhttps://dvs-web.fr`;
  let body = result.body;

  // Si la signature n'est pas déjà dans le body, l'ajouter
  if (!body.includes('06 51 01 95 06') && !body.includes('dvs-web.fr')) {
    body = body.trimEnd() + signature;
  }

  return {
    subject: result.subject,
    body,
  };
}
