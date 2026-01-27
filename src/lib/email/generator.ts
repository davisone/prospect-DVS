import OpenAI from 'openai';
import type { ProspectWithAnalysis } from '@/types';
import { getScoreBreakdown } from '../analysis/score';

const SYSTEM_PROMPT = `Tu es un expert en rédaction de mails de prospection B2B pour une agence web nommée DVS Web, spécialisée dans la création de sites web modernes et performants.

Règles strictes :
- Commence TOUJOURS par parler du problème du prospect, jamais de toi
- Sois direct et concis (max 150 mots)
- Mentionne des faits concrets issus de l'analyse technique
- Ne sois pas agressif, sois aidant et professionnel
- Utilise le vouvoiement
- Termine par une question ouverte
- Signe "L'équipe DVS Web"

Format attendu :
{
  "subject": "Objet du mail (court et accrocheur)",
  "body": "Corps du mail"
}`;

function buildUserPrompt(prospect: ProspectWithAnalysis): string {
  const issues: string[] = [];

  if (prospect.analysis) {
    const breakdown = getScoreBreakdown({
      httpsValid: prospect.analysis.httpsValid,
      hasViewport: prospect.analysis.hasViewport,
      ttfbMs: prospect.analysis.ttfbMs,
      technologies: JSON.parse(prospect.analysis.technologies as unknown as string || '[]'),
      obsoleteTech: JSON.parse(prospect.analysis.obsoleteTech as unknown as string || '[]'),
      rawData: {},
    });

    for (const item of breakdown) {
      if (item.issue) {
        issues.push(item.issue);
      }
    }
  }

  return `Génère un email de prospection pour cette entreprise :

Nom de l'entreprise : ${prospect.name}
Ville : ${prospect.city || 'Non spécifiée'}
Site web : ${prospect.url || 'Non spécifié'}
Score de vétusté : ${prospect.analysis?.score || 0}/100

Problèmes détectés sur le site :
${issues.length > 0 ? issues.map((i) => `- ${i}`).join('\n') : '- Aucun problème majeur détecté'}

Génère un email personnalisé qui met en avant ces problèmes spécifiques et propose une solution.`;
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

  return {
    subject: result.subject,
    body: result.body,
  };
}
