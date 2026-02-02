import OpenAI from 'openai';
import type { ProspectWithAnalysis } from '@/types';
import { getScoreBreakdown } from '../analysis/score';

const SYSTEM_PROMPT = `Tu écris des emails de prospection pour Evan, développeur web indépendant.

TON :
Curieux, bienveillant et professionnel. Tu t'intéresses sincèrement à l'activité du prospect.
Tu parles comme quelqu'un de normal, pas comme un consultant ni comme un commercial.

RÈGLES STRICTES (OBLIGATOIRES) :
- INTERDIT de critiquer le site actuel du prospect, même subtilement
- INTERDIT de mentionner des problèmes, défauts ou points faibles du site
- PAS de jargon technique (interdit : technologies, sécurité, audit, analyse, performance, SEO, UX)
- PAS de phrases de rapport ou d'expert
- PAS de justification abstraite ("ce qui peut", "afin de", "cela permet")
- PAS de flatterie exagérée
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

1. INTRO CHALEUREUSE (1–2 phrases)
   - Salutation
   - Dire simplement que tu es tombé sur leur activité en cherchant des [leur métier] dans leur ville
   - Montrer un intérêt sincère pour ce qu'ils font

2. VALEUR ET CONTEXTE (2–3 phrases)
   - Dire que tu accompagnes des entreprises locales pour les aider à gagner en visibilité et attirer plus de clients grâce à leur site web
   - Mentionner naturellement que tu t'es lancé récemment en freelance avec DVS Web
   - Ne JAMAIS utiliser les mots "junior", "débutant" ou équivalent
   - Rester centré sur la valeur que tu apportes (plus de clients, meilleure visibilité), pas sur les défauts du prospect

3. QUESTION ENGAGEANTE (1–2 phrases)
   - La question doit pousser subtilement à réfléchir à leur site web actuel
   - INTERDIT : les questions fermées auxquelles on peut répondre "non" facilement ("Est-ce que vous avez des projets ?", "Est-ce que ça vous intéresse ?")
   - La question doit faire réfléchir le prospect sur son site actuel et ce qu'il pourrait lui apporter de plus
   - Proposer un échange court, sans pression
   - Exemples autorisés :
     "Pour vous, quel rôle joue votre site dans votre activité aujourd'hui ?"
     "Est-ce que votre site vous amène des clients régulièrement, ou c'est plutôt le bouche-à-oreille qui fait le travail ?"
     "Comment vos clients vous trouvent en général — plutôt via le web ou par d'autres canaux ?"
     "Est-ce que vous sentez que votre site représente bien ce que vous faites au quotidien ?"
   - L'objectif : que le prospect se dise "effectivement, mon site pourrait être mieux" sans qu'on lui ait dit

4. PROPOSITION DE RDV / APPEL (1 phrase)
   - Juste après la question, proposer un échange rapide (appel ou rdv) de manière décontractée
   - Pas de pression, pas de formalisme excessif
   - Exemples autorisés :
     "Si ça vous dit, on peut en discuter autour d'un appel de quelques minutes."
     "Je serais ravi d'en discuter avec vous par téléphone si le sujet vous parle."
     "N'hésitez pas à me dire si un petit échange de 10 min vous conviendrait."

SIGNATURE :
- Le message doit se terminer UNIQUEMENT par :
"Evan"
- N'ajoute aucun titre, aucune coordonnée, aucun texte après
- AUCUNE exception

OBJET DU MAIL (RÈGLES STRICTES) :
- L'objet doit être COURT (4-7 mots max), professionnel et sobre
- INTERDIT : les formules personnelles, familières ou décalées ("Bonjour de la part de...", "Un passionné de...", "Hello !", "Coucou")
- L'objet doit mentionner leur activité ou leur ville, de façon pro
- Exemples valides :
  "Votre boulangerie à Lyon"
  "Visibilité web pour votre salon"
  "Site web — [nom de l'entreprise]"
  "Votre présence en ligne à [ville]"
- L'objet doit donner envie d'ouvrir le mail sans paraître spam ni trop familier

FORMAT DE SORTIE OBLIGATOIRE (json) :
Tu dois répondre UNIQUEMENT en json valide, sans aucun texte avant ou après.

{
  "subject": "Objet court et professionnel (voir règles ci-dessus)",
  "body": "Email complet (termine uniquement par Evan)"
}

RAPPEL :
Ne JAMAIS critiquer le site du prospect. L'email doit donner envie de répondre, pas mettre sur la défensive.
Si une phrase ressemble à un audit, un reproche ou un constat négatif, elle est interdite et doit être réécrite.`;

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
  return `Entreprise : ${prospect.name}
Ville : ${prospect.city || 'inconnue'}
Site : ${prospect.url || 'pas de site'}

Écris un email court et humain. Tu t'intéresses à leur activité, tu te présentes, et tu demandes s'ils ont des projets côté site web. Ne critique JAMAIS leur site actuel.`;
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
