import { describe, expect, it } from 'vitest';
import { ID } from 'src/constants/ids';
import { deriveUuid } from 'src/model/derive';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('identificatori stabili dell’app', () => {
  it('ogni identificatore registrato è un UUID v4', () => {
    const errati = Object.entries(ID).filter(([, v]) => !V4.test(v));
    expect(errati).toEqual([]);
  });

  it('nessun identificatore è riusato per due chiavi', () => {
    const valori = Object.values(ID);
    expect(new Set(valori).size).toBe(valori.length);
  });

  it('gli identificatori derivati sono v4, deterministici e distinti', () => {
    const a = deriveUuid(ID['view.leadPronti'], 'col', ID['appartenenza.titolo']);
    expect(a).toMatch(V4);
    expect(deriveUuid(ID['view.leadPronti'], 'col', ID['appartenenza.titolo'])).toBe(a);
    expect(deriveUuid(ID['view.leadPronti'], 'col', ID['appartenenza.evidenza'])).not.toBe(a);
    const tanti = new Set(Array.from({ length: 5000 }, (_, i) => deriveUuid('x', String(i))));
    expect(tanti.size).toBe(5000);
  });
});
