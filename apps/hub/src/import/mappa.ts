// Riconoscimento colonne. Il preset LeadSpark usa le intestazioni attese dall'export
// LeadSpark (da confermare con un export reale: vedi docs/CAPACITA-TWENTY-v2.63.md).
export type Campo = 'email' | 'nome' | 'cognome' | 'nomeCompleto' | 'azienda' | 'ruolo' | 'telefono' | 'sito' | 'citta' | 'settore' | 'evidenza';

export const ETICHETTE: Record<Campo, string> = {
  email: 'Email',
  nome: 'Nome',
  cognome: 'Cognome',
  nomeCompleto: 'Nome e cognome',
  azienda: 'Azienda',
  ruolo: 'Ruolo',
  telefono: 'Telefono',
  sito: 'Sito web',
  citta: 'Città',
  settore: 'Settore',
  evidenza: 'Nota / evidenza',
};

const SINONIMI: Record<Campo, string[]> = {
  email: ['email', 'e-mail', 'mail', 'indirizzo email', 'email address', 'posta elettronica'],
  nome: ['nome', 'first name', 'firstname', 'given name'],
  cognome: ['cognome', 'last name', 'lastname', 'surname', 'family name'],
  nomeCompleto: ['nome completo', 'nome e cognome', 'contatto', 'referente', 'full name', 'name'],
  azienda: ['azienda', 'ragione sociale', 'società', 'societa', 'company', 'company name', 'organizzazione', 'organization'],
  ruolo: ['ruolo', 'job title', 'title', 'qualifica', 'posizione', 'mansione'],
  telefono: ['telefono', 'tel', 'phone', 'cellulare', 'mobile', 'numero di telefono'],
  sito: ['sito', 'sito web', 'website', 'web', 'dominio', 'domain', 'url'],
  citta: ['città', 'citta', 'city', 'comune', 'località', 'localita'],
  settore: ['settore', 'industry', 'categoria', 'ateco'],
  evidenza: ['note', 'nota', 'evidenza', 'commento', 'notes', 'messaggio'],
};

const LEADSPARK: Record<string, Campo> = {
  lead_email: 'email',
  lead_first_name: 'nome',
  lead_last_name: 'cognome',
  company_name: 'azienda',
  job_title: 'ruolo',
  phone: 'telefono',
  website: 'sito',
  city: 'citta',
  industry: 'settore',
  notes: 'evidenza',
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s]+/g, ' ').trim();

export type Mappatura = Array<{ intestazione: string; campo: Campo | null }>;

export const riconosciColonne = (intestazioni: string[], formato: 'AUTOMATICO' | 'LEADSPARK'): Mappatura => {
  const usati = new Set<Campo>();
  return intestazioni.map((h) => {
    let campo: Campo | null = null;
    if (formato === 'LEADSPARK') campo = LEADSPARK[h.trim().toLowerCase()] ?? null;
    if (!campo) {
      const n = norm(h);
      campo = (Object.keys(SINONIMI) as Campo[]).find((c) => SINONIMI[c].some((s) => norm(s) === n)) ?? null;
    }
    if (campo && usati.has(campo)) campo = null; // una colonna per campo: la prima vince
    if (campo) usati.add(campo);
    return { intestazione: h, campo };
  });
};
