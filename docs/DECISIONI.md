# Decisioni e limiti verificati

Formato: decisione → alternativa scartata → costo o limite che ha deciso. Data 25/11/2026, Twenty v2.63.0.

1. **Un workspace agenzia + proiezioni autorizzate (Hub)** invece di un workspace per cliente.
   Per-cliente: DNS wildcard, licenza per workspace illimitati, nessuna ricerca trasversale, N upgrade.
   Limite accettato: l'Hub è il confine di sicurezza → test di isolamento bloccanti (unit + e2e su dominio reale).
2. **Referenti cliente solo nell'Hub**, accesso con link monouso via email; appartenenza alla commessa dal campo
   esplicito "Email referente cliente" in Twenty, mai dal dominio email. Revoca immediata (controllo a ogni richiesta).
3. **Permessi per riga di Twenty non usati**: richiedono la licenza Organization. Ruoli interni per oggetto/campo
   (gratuiti in self-host); il ruolo Commerciale non vede i lead dei committenti, Supporto non vede dati economici.
4. **Registri "solo aggiunta" (storico esiti, opposizioni)**: Twenty 2.63 richiede `canUpdate` per creare
   (`canCreate` senza `canUpdate` → 403, trovato dai test e2e). Immutabilità garantita dal processo + audit.
5. **Logic function di Twenty non usate**: in self-host sono disattivate (`LOGIC_FUNCTION_TYPE`) e costano RAM.
   Eventi → webhook firmati (HMAC-SHA256 su `timestamp:corpo`) → Hub, con dedup su `eventId` Twenty.
6. **Effetti esterni via outbox** con chiave operativa: al più una volta; dopo un crash a metà effetto lo stato
   diventa "incerto" e richiede riconciliazione, non un nuovo invio.
7. **Code eventi con lease** (`UPDATE … FOR UPDATE SKIP LOCKED … RETURNING`) invece di transazioni lunghe:
   nessun lock tenuto durante chiamate di rete (difetto emerso nei test con PGlite).
8. **Hub in TypeScript eseguito da Node 24 in sviluppo, impacchettato con esbuild per il deploy**; portale e bundle
   dell'Hub costruiti in locale (o in CI) e copiati sulla VPS. Due volte un `yarn install`/build dentro l'immagine
   ha saturato la sandbox (2,2 GB `MemoryHigh`, swap 0) fino al blocco di Twenty: l'immagine ora copia solo artefatti.
9. **Limiti della sandbox non alzati**: la produzione sullo stesso server ha poca memoria libera e picchi vicini al totale.
   Memoria misurata: Twenty server ~750 MB, worker ~250-500 MB (sotto 400 MB di heap va in OOM all'avvio), Postgres ~65 MB, Hub ~55 MB.
10. **Dominio unico `crm.inkarma.it`** con instradamento per percorso (vedi runbook): un certificato, cookie del
    portale isolati dal path `/api/portale`, webhook non esposti.
