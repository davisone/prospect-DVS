import OpenAI from 'openai';
import type { ProspectWithAnalysis } from '@/types';
import { getScoreBreakdown } from '../analysis/score';

const SYSTEM_PROMPT = `Tu écris des emails de prospection pour Evan, développeur web indépendant.

TON :
Direct, humain et professionnel. Poli mais sans formules commerciales.
Tu parles comme quelqu’un de normal, pas comme un consultant ni comme un commercial.

RÈGLES STRICTES (OBLIGATOIRES) :
- PAS de jargon technique (interdit : technologies, sécurité, audit, analyse, performance, SEO, UX)
- PAS de phrases de rapport ou d’expert
- PAS de justification abstraite ("ce qui peut", "afin de", "cela permet")
- PAS de flatterie
- PAS de phrases bateau
- PAS de ton vendeur
- Vouvoiement obligatoire
- Langage simple, naturel, oral

POLITESSE (INTRODUCTION) :
- Commence TOUJOURS par une phrase polie et naturelle
- Exemples valides :
  "Bonjour,"
  "Bonjour Monsieur,"
  "Bonjour Madame,"
- PAS de formules lourdes ("je me permets", "n'hésitez pas", "cordialement")

STRUCTURE OBLIGATOIRE (6–8 phrases max) :

1. INTRO POLIE ET SIMPLE (1–2 phrases)
   - Salutation
   - Dire simplement que tu es tombé sur leur site en cherchant des [leur métier] dans leur ville
   - Ton humain, normal

2. CONSTAT CONCRET (2–3 phrases)
   - Décrire uniquement des problèmes visibles pour un humain
   - Parler comme quelqu’un qui a juste navigué sur le site
   - Exemples autorisés :
     "le site commence à dater"
     "sur téléphone, ce n’est pas très agréable"
     "on a du mal à trouver les infos importantes"
   - Expliquer brièvement que ça fait partir des visiteurs
   - Jamais de termes techniques

3. PROPOSITION SIMPLE (2–3 phrases)
   - Dire que tu refais des sites pour des entreprises locales
   - Mentionner naturellement que tu t’es lancé récemment en freelance avec DVS Web
   - Ne JAMAIS utiliser les mots "junior", "débutant" ou équivalent
   - Proposer un échange court, sans pression
   - Terminer par une question simple.general

SIGNATURE :
- Le message doit se terminer UNIQUEMENT par :
"Evan"
- N’ajoute aucun titre, aucune coordonnée, aucun texte après
- AUCUNE exception

FORMAT DE SORTIE OBLIGATOIRE (json) :
Tu dois répondre UNIQUEMENT en json valide, sans aucun texte avant ou après.

{
  "subject": "Objet court, simple et humain",
  "body": "Email complet (termine uniquement par Evan)"
}

RAPPEL :
Si une phrase sonne comme un audit, un rapport ou un discours de consultant, elle est interdite et doit être réécrite.`;

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

  return `Entreprise : ${prospect.name}
Ville : ${prospect.city || 'inconnue'}
Site : ${prospect.url || 'pas de site'}

Ce qui cloche sur leur site :
${problems.length > 0 ? problems.slice(0, 2).map(p => `- ${p}`).join('\n') : '- Site vieillot qui mériterait un coup de neuf'}

Écris un email direct et franc. Pas de blabla, pas de flatterie. Tu constates un problème, tu proposes d'en parler.`;
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
    max_tokens: 800,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);

  // S'assurer que la signature complète est présente
  let body = result.body.trimEnd();

  // Retirer "Evan" seul s'il est à la fin (sera remplacé par la signature complète)
  body = body.replace(/\n*Evan\s*$/i, '');

  // Ajouter la signature complète
  const signature = `\n\nEvan\n06 51 01 95 06\ndvs-web.fr`;
  body = body.trimEnd() + signature;

  return {
    subject: result.subject,
    body,
  };
}
