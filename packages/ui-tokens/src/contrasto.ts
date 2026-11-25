// Verifica i contrasti WCAG delle coppie dichiarate in tokens.ts. Esce con errore se una fallisce.
import { colore, coppie } from './tokens.ts';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
};

let fail = 0;
for (const [nome, fg, bg, min] of coppie) {
  const r = ratio(colore[fg], colore[bg]);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'ok ' : 'NO '} ${r.toFixed(2).padStart(5)} ≥ ${min}  ${nome}`);
}
if (fail) {
  console.error(`${fail} coppie sotto soglia`);
  process.exit(1);
}
