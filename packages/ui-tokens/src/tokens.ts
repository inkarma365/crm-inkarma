// Sistema visivo "Bolla" dell'area clienti inKarma.
// Metafora: la bolla di consegna. Ogni lead arriva come un foglio con una matrice da firmare;
// ogni esito lascia un timbro. Carta fredda e inchiostro blu notte, matita copiativa viola per
// le azioni, una sola scintilla calda per ciò che aspetta una risposta dal cliente.
export const colore = {
  carta: '#F4F6F9', // sfondo
  foglio: '#FFFFFF', // superfici
  inchiostro: '#1B2140', // testo principale
  inchiostroTenue: '#4A5275', // testo secondario
  copiativo: '#4A3DCC', // azioni, link, timbri
  copiativoScuro: '#3A2FA8', // pressione / hover
  copiativoVelo: '#ECEAFB', // fondi selezionati
  scintilla: '#F5A524', // SOLO "serve il tuo esito" (mai testo su bianco)
  scintillaVelo: '#FFF4DE',
  si: '#13795B', // esito positivo
  siVelo: '#E3F3EC',
  no: '#B42318', // esito negativo
  noVelo: '#FBE9E7',
  filo: '#D5DAE3', // bordi, perforazioni
} as const;

export const font = {
  titoli: '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif',
  testo: '"Atkinson Hyperlegible Next", "Atkinson Hyperlegible", Verdana, sans-serif',
} as const;

/** Scala tipografica (px): 14 / 16 / 20 / 28 / 40. */
export const scala = { s: 14, m: 16, l: 20, xl: 28, xxl: 40 } as const;

/** Coppie testo/sfondo usate davvero nell'interfaccia: devono superare WCAG AA. */
export const coppie: Array<[string, keyof typeof colore, keyof typeof colore, number]> = [
  ['testo su carta', 'inchiostro', 'carta', 4.5],
  ['testo su foglio', 'inchiostro', 'foglio', 4.5],
  ['secondario su foglio', 'inchiostroTenue', 'foglio', 4.5],
  ['secondario su carta', 'inchiostroTenue', 'carta', 4.5],
  ['link su foglio', 'copiativo', 'foglio', 4.5],
  ['bottone pieno', 'foglio', 'copiativo', 4.5],
  ['timbro positivo', 'si', 'foglio', 4.5],
  ['timbro negativo', 'no', 'foglio', 4.5],
  ['positivo su velo', 'si', 'siVelo', 4.5],
  ['negativo su velo', 'no', 'noVelo', 4.5],
  ['copiativo su velo', 'copiativo', 'copiativoVelo', 4.5],
  ['inchiostro su scintilla velo', 'inchiostro', 'scintillaVelo', 4.5],
  ['scintilla come segno grafico su foglio', 'scintilla', 'foglio', 1.9],
  ['filo come bordo su foglio', 'filo', 'foglio', 1.2],
];
