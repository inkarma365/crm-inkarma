import { z } from 'zod';

const Config = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3010),
  /** URL pubblico del portale (link nelle email). */
  PUBLIC_URL: z.url().default('http://localhost:33010'),
  HUB_DATABASE_URL: z.string().min(1),
  TWENTY_URL: z.url().default('http://server:3000'),
  /** API key Twenty con ruolo "Hub" (mai il ruolo Admin in produzione). */
  TWENTY_API_KEY: z.string().min(20),
  /** Segreto condiviso con il webhook Twenty (HMAC-SHA256). */
  TWENTY_WEBHOOK_SECRET: z.string().min(16),
  /** Chiave per firmare cookie e token del portale. */
  SESSION_SECRET: z.string().min(32),
  /** SMTP delle email di servizio. In sviluppo: Mailpit. */
  SERVICE_SMTP_URL: z.string().default('smtp://mailpit:1025'),
  SERVICE_MAIL_FROM: z.string().default('inKarma <servizio@inkarma.test>'),
  /** In sviluppo ogni email di servizio finisce in questa casella, qualunque sia il destinatario. */
  SERVICE_MAIL_REDIRECT_TO: z.string().optional(),
  PORTAL_DIST_DIR: z.string().default('../portal/dist'),
});
export type Config = z.infer<typeof Config>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const parsed = Config.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Configurazione Hub non valida:\n  ${fields}`);
  }
  if (parsed.data.NODE_ENV !== 'production' && !parsed.data.SERVICE_MAIL_REDIRECT_TO) {
    parsed.data.SERVICE_MAIL_REDIRECT_TO = 'casella-prova@inkarma.test';
  }
  return parsed.data;
};
