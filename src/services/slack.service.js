import { config } from '../config/index.js';

export const reportServerError = async ({ method, path, message, stack, statusCode }) => {
  if (!config.slack.enabled) return;

  const payload = {
    text: `Error ${statusCode} en ${method} ${path}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `BildyApp — Error ${statusCode}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Método:*\n${method}` },
          { type: 'mrkdwn', text: `*Ruta:*\n${path}` },
          { type: 'mrkdwn', text: `*Cuándo:*\n${new Date().toISOString()}` },
          { type: 'mrkdwn', text: `*Entorno:*\n${config.nodeEnv}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Mensaje:*\n\`\`\`${message ?? '(sin mensaje)'}\`\`\`` },
      },
    ],
  };

  if (stack) {
    payload.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Stack:*\n\`\`\`${String(stack).slice(0, 2500)}\`\`\``,
      },
    });
  }

  try {
    await fetch(config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[slack] No se pudo notificar el error:', err.message);
  }
};
