export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MSG_RETE = 'Connessione assente o instabile: non abbiamo ricevuto la richiesta. Riprova.';

export const api = async <T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`/api/portale${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        // Le richieste che modificano dati portano questo header: il server rifiuta le altre (CSRF).
        'x-portale': '1',
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, MSG_RETE);
  }
  const data = (await res.json().catch(() => ({}))) as { errore?: string };
  if (!res.ok) throw new ApiError(res.status, data.errore ?? 'Qualcosa non ha funzionato. Riprova tra poco.');
  return data as T;
};

/** Chiave d'invio: resta la stessa nei tentativi successivi, così il server registra un solo esito. */
export const nuovaChiave = (): string =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`);
