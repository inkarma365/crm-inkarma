import { describe, expect, it } from 'vitest';
import { AnyEvent, dedupKey } from './events.ts';

const base = {
  id: 'evt-0001-abcdef',
  source: 'portale',
  scope: { kind: 'commessa', commessaId: '0b7c1f9e-3d55-4c1a-9a51-6a3c0f6b2e10' },
  occurredAt: '2026-11-25T09:00:00+01:00',
} as const;

describe('contratti eventi', () => {
  it('accetta un feedback v1 valido', () => {
    const e = AnyEvent.parse({
      ...base,
      type: 'lead.feedback',
      version: 1,
      data: {
        consegnaId: '5d2e8c4b-1f3a-4b6e-8c9d-0a1b2c3d4e5f',
        esito: 'rifiutato',
        motivo: 'Fuori zona',
        autore: 'referente@rossi.test',
        tardivo: false,
      },
    });
    expect(dedupKey(e)).toBe('portale:lead.feedback:evt-0001-abcdef');
  });

  it('rifiuta una versione non prevista', () => {
    expect(() =>
      AnyEvent.parse({ ...base, type: 'lead.feedback', version: 2, data: {} }),
    ).toThrow();
  });

  it('rifiuta un evento senza ambito', () => {
    const { scope: _s, ...noScope } = base;
    expect(() =>
      AnyEvent.parse({
        ...noScope,
        type: 'ticket.updated',
        version: 1,
        data: { ticketId: '5d2e8c4b-1f3a-4b6e-8c9d-0a1b2c3d4e5f', riferimento: 'T-1', stato: 'aperto', canale: 'email' },
      }),
    ).toThrow();
  });
});
