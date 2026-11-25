import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export const MAX_RIGHE = 5000;
export type Tabella = { intestazioni: string[]; righe: string[][] };

const pulisci = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v !== null) {
    const o = v as { text?: string; result?: unknown; hyperlink?: string; richText?: Array<{ text: string }> };
    if (o.richText) return o.richText.map((t) => t.text).join('').trim();
    if (o.text) return String(o.text).trim();
    if (o.result !== undefined) return pulisci(o.result);
    if (o.hyperlink) return o.hyperlink.replace(/^mailto:/, '').trim();
  }
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
};

/** CSV (separatore ; o , rilevato) o XLSX (primo foglio). La prima riga sono le intestazioni. */
export const leggiTabella = async (nomeFile: string, contenuto: Buffer): Promise<Tabella> => {
  const lower = nomeFile.toLowerCase();
  let righe: string[][];
  if (lower.endsWith('.xlsx')) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(contenuto as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('Il file Excel non contiene fogli');
    righe = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const valori = (row.values as unknown[]).slice(1);
      righe.push(valori.map(pulisci));
    });
  } else if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const testo = contenuto.toString('utf8').replace(/^﻿/, '');
    const r = Papa.parse<string[]>(testo, { skipEmptyLines: 'greedy', delimitersToGuess: [';', ',', '\t'] });
    righe = r.data.map((row) => row.map(pulisci));
  } else {
    throw new Error('Formato non supportato: carica un file .csv o .xlsx');
  }
  const [intestazioni = [], ...dati] = righe;
  if (!intestazioni.length) throw new Error('Il file è vuoto');
  if (dati.length > MAX_RIGHE) throw new Error(`Il file ha ${dati.length} righe: il massimo per import è ${MAX_RIGHE}. Dividilo in più file.`);
  return { intestazioni: intestazioni.map((h) => h.trim()), righe: dati.filter((r) => r.some((c) => c)) };
};
