import { Resend } from 'resend';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'contact@dvs-web.fr';
  const senderName = process.env.SENDER_NAME || 'DVS Web';

  if (!apiKey) {
    throw new Error('Resend API key not configured');
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: params.to,
      subject: params.subject,
      html: formatEmailHtml(params.body),
      text: params.body,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatEmailHtml(body: string): string {
  // Convert line breaks to HTML and wrap in basic styling
  const htmlBody = body
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin: 0 0 10px 0;">${line}</p>`))
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${htmlBody}
</body>
</html>
  `.trim();
}
