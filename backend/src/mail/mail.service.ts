import { Injectable, Logger } from '@nestjs/common';

// Un solo llamado HTTP a la API de Resend (https://resend.com/docs/api-reference/emails/send-email)
// — no hace falta instalar su SDK para esto.
const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // text es obligatorio, no opcional: un mail sin parte de texto plano es una señal
  // fuerte de spam para Gmail/Outlook — sobre todo viniendo de un dominio recién
  // verificado, sin reputación de envío todavía.
  async send(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // sin key configurada todavía (ver README) — no se manda de verdad, pero no
      // rompe el flujo: se loguea para poder seguir probando en local.
      this.logger.warn(
        `RESEND_API_KEY no configurada — mail a ${to} solo logueado:\n${subject}\n${text}`,
      );
      return;
    }

    const from =
      process.env.MAIL_FROM ?? 'Facturador ARCA <onboarding@resend.dev>';
    const fullHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;color:#1a2420">${html}</body></html>`;
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html: fullHtml, text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // no relanzar como error del request del usuario: si Resend está caído, el
      // registro/reset ya se guardó en la base, no tiene sentido devolver 500 por
      // esto — se loguea para poder investigarlo. Se incluye el contenido completo
      // (no solo el error) porque el link ya no se puede recuperar de otra forma —
      // la base solo guarda el hash del token, nunca el valor real.
      this.logger.error(
        `Resend rechazó el envío a ${to} (${res.status}): ${detail}\nContenido que no se pudo mandar:\n${subject}\n${text}`,
      );
    }
  }
}
