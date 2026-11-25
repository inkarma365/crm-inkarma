// Contratti d'evento versionati tra Twenty, Hub, mailer e provider.
// Regola: un evento pubblicato non cambia mai forma. Un cambiamento incompatibile
// crea una nuova versione (es. lead.delivered@2) e l'Hub accetta entrambe finché serve.
import { z } from 'zod';

export const EventSource = z.enum([
  'twenty',
  'hub',
  'portale',
  'import',
  'mailer',
  'imap',
  'stripe',
  'operatore',
]);
export type EventSource = z.infer<typeof EventSource>;

/** Ambito obbligatorio: ogni fatto appartiene a una commessa, oppure all'agenzia stessa. */
export const Scope = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('agenzia') }),
  z.object({
    kind: z.literal('commessa'),
    commessaId: z.uuid(),
    campagnaId: z.uuid().optional(),
  }),
]);
export type Scope = z.infer<typeof Scope>;

const envelope = <T extends string, V extends number, D extends z.ZodType>(
  type: T,
  version: V,
  data: D,
) =>
  z.object({
    /** Identificatore stabile assegnato dalla sorgente: base della deduplica. */
    id: z.string().min(8).max(200),
    type: z.literal(type),
    version: z.literal(version),
    source: EventSource,
    scope: Scope,
    /** Quando il fatto è avvenuto secondo la sorgente. */
    occurredAt: z.iso.datetime({ offset: true }),
    /** Quando l'Hub l'ha ricevuto (valorizzato dall'Hub, mai dalla sorgente). */
    receivedAt: z.iso.datetime({ offset: true }).optional(),
    data,
  });

export const LeadIngestedV1 = envelope(
  'lead.ingested',
  1,
  z.object({
    importBatchId: z.string().optional(),
    personId: z.uuid().optional(),
    email: z.email().optional(),
    provenienza: z.string().min(1),
    rowNumber: z.number().int().positive().optional(),
    outcome: z.enum(['creato', 'aggiornato', 'duplicato_in_revisione', 'escluso_opposizione', 'errore']),
  }),
);

export const ReplyReceivedV1 = envelope(
  'reply.received',
  1,
  z.object({
    messageId: z.string().min(3), // header Message-ID
    inReplyTo: z.string().optional(),
    references: z.array(z.string()).default([]),
    threadKey: z.string().min(1),
    mailbox: z.string().min(3),
    fromEmail: z.email(),
    subject: z.string().default(''),
    isAutoReply: z.boolean().default(false),
  }),
);

export const LeadDeliveredV1 = envelope(
  'lead.delivered',
  1,
  z.object({
    consegnaId: z.uuid(),
    appartenenzaId: z.uuid(),
    personId: z.uuid(),
    destinatarioCommercialeEmail: z.email().optional(),
    evidenza: z.string().max(500).optional(),
  }),
);

export const LeadFeedbackV1 = envelope(
  'lead.feedback',
  1,
  z.object({
    consegnaId: z.uuid(),
    esito: z.enum(['accettato', 'rifiutato', 'incontro_fissato', 'incontro_svolto', 'opportunita', 'vendita', 'perso']),
    motivo: z.string().max(500).optional(),
    autore: z.string().min(1),
    /** Vero se l'esito arriva dopo la chiusura di un report già inviato. */
    tardivo: z.boolean(),
  }),
);

export const TicketUpdatedV1 = envelope(
  'ticket.updated',
  1,
  z.object({
    ticketId: z.uuid(),
    riferimento: z.string().min(3),
    stato: z.enum(['aperto', 'in_lavorazione', 'attesa_cliente', 'risolto', 'riaperto']),
    statoPrecedente: z.enum(['aperto', 'in_lavorazione', 'attesa_cliente', 'risolto', 'riaperto']).optional(),
    canale: z.enum(['email', 'portale', 'manuale']),
  }),
);

export const PaymentUpdatedV1 = envelope(
  'payment.updated',
  1,
  z.object({
    richiestaPagamentoId: z.uuid(),
    stato: z.enum(['in_attesa', 'pagato', 'parziale', 'fallito', 'rimborsato', 'contestato', 'annullato']),
    /** Importo in unità minime (centesimi). */
    importoMinimo: z.number().int(),
    valuta: z.string().length(3),
    provider: z.enum(['stripe', 'bonifico']),
    riferimentoProvider: z.string().optional(),
  }),
);

export const ReportPublishedV1 = envelope(
  'report.published',
  1,
  z.object({
    reportId: z.uuid(),
    versione: z.number().int().positive(),
    periodoDa: z.iso.date(),
    periodoA: z.iso.date(),
    snapshotHash: z.string().min(16),
  }),
);

export const AnyEvent = z.discriminatedUnion('type', [
  LeadIngestedV1,
  ReplyReceivedV1,
  LeadDeliveredV1,
  LeadFeedbackV1,
  TicketUpdatedV1,
  PaymentUpdatedV1,
  ReportPublishedV1,
]);
export type AnyEvent = z.infer<typeof AnyEvent>;
export type EventType = AnyEvent['type'];

/** Chiave di deduplica: stessa sorgente + stesso id = stesso fatto. */
export const dedupKey = (e: Pick<AnyEvent, 'source' | 'type' | 'id'>): string =>
  `${e.source}:${e.type}:${e.id}`;
