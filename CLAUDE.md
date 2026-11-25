# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cos'è

CRM per inKarma (agenzia) e LeadSpark (lead generation per conto terzi), costruito su **Twenty** (v2.63.0, pinnata per tag+digest). Il brief completo, con criteri di accettazione e superfici, è in `Progetto-CRM-inKarma-LeadSpark.md`. Vincolo centrale del dominio: la pipeline con cui l'agenzia vende i propri servizi è distinta dai risultati generati per ciascun committente (**commessa**); la stessa azienda può essere cliente dell'agenzia e prospect in una campagna altrui, con visibilità e cronologia separate.

Il codice, i commenti e i nomi di dominio sono in italiano. Mantieni questa convenzione.

## Struttura

Yarn 4 workspace (Node >= 24.5, TypeScript eseguito direttamente da Node: `node src/main.ts`, senza build). Workspace radice: `packages/*`, `apps/hub`, `apps/portal`. **`apps/twenty-app` NON è un workspace della radice**: ha un proprio `package.json`/`yarn.lock` e va gestito a parte.

- `apps/twenty-app` — app Twenty (SDK `twenty-sdk`): oggetti, campi, viste, ruoli, navigazione e layout del modello dati agenzia/LeadSpark. Le regole su front component e UUID sono in `apps/twenty-app/AGENTS.md` (UUID sempre v4; `src/model/derive.ts` genera UUID v4 deterministici per sotto-elementi).
- `apps/hub` — servizio Fastify + Kysely/Postgres che sta accanto a Twenty (webhook, portale clienti, notifiche).
- `apps/portal` — SPA React/Vite del portale committente, servita dall'Hub su `/portale` (`PORTAL_DIST_DIR`, default `../portal/dist`).
- `packages/contracts` — contratti d'evento zod versionati condivisi. Un evento pubblicato non cambia mai forma: un cambiamento incompatibile crea una nuova versione (`lead.delivered@2`) e l'Hub accetta entrambe.
- `packages/ui-tokens` — token di design e controllo contrasto, usati dal portale.
- `infra/compose` — stack Docker (server, worker, db, redis, hub, mailpit); `infra/scripts` — bootstrap/provisioning/deploy; `fixtures/seed-demo.mjs` — dati demo sintetici.

## Comandi

Dalla radice:

```bash
yarn install
yarn typecheck                 # tsc in tutti i workspace
yarn test                      # vitest in tutti i workspace
yarn build:portal
yarn workspace @inkarma/hub test                          # solo Hub
yarn workspace @inkarma/hub vitest run test/webhook.test.ts   # singolo file
yarn workspace @inkarma/hub vitest run -t "nome del test"     # singolo test
yarn workspace @inkarma/hub dev          # node --watch src/main.ts
yarn workspace @inkarma/hub migrate
yarn workspace @inkarma/portal dev       # Vite, proxy /api → localhost:33010
```

In `apps/twenty-app` (gestore: yarn, CLI `twenty` globale): `yarn lint` (oxlint), `yarn typecheck`, `yarn test:unit`, `yarn test` (integrazione: richiede un workspace usa-e-getta con `TWENTY_API_URL` e `TWENTY_API_KEY`; installa/disinstalla l'app), `twenty app apply --create`, `twenty app dev`.

I test dell'Hub usano PGlite in memoria (nessun Postgres richiesto) e un finto Twenty (`test/fake-twenty.ts`); i file girano in sequenza.

## Architettura dell'Hub (da leggere più file per capirla)

- **Ingresso eventi**: `POST /webhooks/twenty` verifica l'HMAC-SHA256 di `timestamp:corpo grezzo` (`twenty/webhook.ts`), normalizza il payload (le versioni di Twenty usano chiavi diverse) e registra l'evento in `event_log` con deduplica su `eventId` (`events/store.ts`). Risponde 200 anche ai duplicati.
- **Elaborazione**: `main.ts` esegue un ciclo `processPending` alla volta, risvegliato dai webhook e da un timer di 5 s. Dopo `MAX_ATTEMPTS` (8) errori l'evento resta fermo per il rilancio manuale.
- **Effetti esterni** (email, chiamate a Twenty) passano da `performEffect` in `effects/outbox.ts`: al più una volta per `operationKey`; un effetto `in_flight` trovato all'avvio diventa `uncertain` (revisione umana), mai ripetuto alla cieca.
- **Portale**: la commessa viene sempre dalla sessione, mai dalla richiesta. `portal/scope.ts` è l'UNICO accesso del portale ai dati Twenty: filtro lato server, ricontrollo di ogni record, 404 identico per "altra commessa" e "inesistente", proiezione esplicita dei campi. Non aggirarlo con chiamate dirette al client Twenty. `reconcileCommesse` riallinea periodicamente gli accessi (ogni 10 min).
- **Ambito**: ogni evento appartiene a `agenzia` oppure a una `commessa` (`Scope` in `packages/contracts`).
- Configurazione validata con zod in `config.ts`; fuori da produzione le email di servizio sono reindirizzate a `SERVICE_MAIL_REDIRECT_TO`.

## Ambiente crmdev

- Stack pubblicato solo su `127.0.0.1:33000-33099` della VPS `crmdev` (Docker rootless, raggiungibile via tunnel SSH). Twenty su 33000, Hub su 33010, Mailpit su 33025.
- `infra/scripts/deploy.sh [servizi]` fa push del ramo corrente sul mirror bare della VPS, aggiorna il checkout e lancia `docker compose up -d --build`. Host override: `CRMDEV_HOST`.
- Primo avvio: `bootstrap-workspace.mjs` (admin + API key) → installazione app Twenty → `provision-hub.mjs` (API key col ruolo "Servizio Hub", mai Admin, e webhook firmato) → opzionale `fixtures/seed-demo.mjs`. Gli script sono idempotenti e scrivono i segreti in `.secrets/` (non versionato).
- Limiti di memoria dimensionati sulla quota di 2,5 GB della slice: il worker Twenty va in OOM sotto ~400 MB di heap (da qui `--max-old-space-size=700`). Non ridurli senza misurare.
- Twenty rifiuta variabili d'ambiente vuote: quelle facoltative stanno in `infra/compose/twenty-extra.env` (vedi `.example`).
- Protezione SSRF di Twenty attiva: l'unico host interno raggiungibile dai webhook è `hub` (`OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS`).
- Credenziali: `credenziali-*.md` e `.secrets/` sono ignorati da git; non riportarli in output, commit o report.

## Note

- `docs/runbook/` è vuota e `tests/` alla radice è vuota. Il commento nel compose cita `docs/COMANDI.md`, che non esiste.
- Per le migrazioni CloudPanel valgono le istruzioni in `le istruzioni CloudPanel locali (fuori repo)`.
