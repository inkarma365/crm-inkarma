import nodemailer from 'nodemailer';
import { PermanentEffectError } from '../effects/outbox.ts';
import type { Rendered } from './templates.ts';

export type ServiceMail = {
  to: string;
  rendered: Rendered;
  /** Chiave operativa: diventa header e Message-ID stabile (dedup anche lato ricevente). */
  operationKey: string;
  replyTo?: string;
};

export type SentMail = { messageId: string; accepted: string[]; redirectedFrom: string | null };

export interface ServiceMailer {
  send(mail: ServiceMail): Promise<SentMail>;
}

/**
 * Mailer SMTP per le email di servizio (coda e reputazione separate dall'outreach).
 * In sviluppo `redirectTo` è obbligatorio: ogni messaggio finisce nella casella di prova,
 * con il destinatario originale nell'header X-Inkarma-Destinatario.
 */
export const createSmtpMailer = (opts: { url: string; from: string; redirectTo?: string; domain?: string }): ServiceMailer => {
  const transport = nodemailer.createTransport(opts.url);
  const domain = opts.domain ?? 'inkarma.test';
  return {
    async send(mail) {
      const to = opts.redirectTo ?? mail.to;
      const messageId = `<${mail.operationKey.replace(/[^a-zA-Z0-9._-]/g, '.')}@${domain}>`;
      try {
        const info = await transport.sendMail({
          from: opts.from,
          to,
          replyTo: mail.replyTo,
          subject: mail.rendered.subject,
          html: mail.rendered.html,
          text: mail.rendered.text,
          messageId,
          headers: {
            'X-Inkarma-Template': `${mail.rendered.template}@${mail.rendered.version}`,
            'X-Inkarma-Operazione': mail.operationKey,
            'Auto-Submitted': 'auto-generated',
            ...(opts.redirectTo ? { 'X-Inkarma-Destinatario': mail.to } : {}),
          },
        });
        return { messageId, accepted: (info.accepted ?? []).map(String), redirectedFrom: opts.redirectTo ? mail.to : null };
      } catch (err) {
        const code = (err as { responseCode?: number }).responseCode;
        // 5xx SMTP = rifiuto definitivo: non ritentare.
        if (code && code >= 500) throw new PermanentEffectError(`SMTP ${code}: ${(err as Error).message}`);
        throw err;
      }
    },
  };
};
