# CRM inKarma × LeadSpark

[![CI](https://github.com/inkarma365/crm-inkarma/actions/workflows/ci.yml/badge.svg)](https://github.com/inkarma365/crm-inkarma/actions/workflows/ci.yml)

CRM per un'agenzia digitale (inKarma) e per il suo servizio di lead generation per conto terzi (LeadSpark),
costruito su [Twenty](https://github.com/twentyhq/twenty) **v2.63.0** (pinnata per tag e digest).

Il vincolo che guida tutto il progetto: **la pipeline con cui l'agenzia vende i propri servizi è separata dai
risultati generati per ciascun committente**. La stessa azienda può essere cliente dell'agenzia e prospect in una
campagna di un altro cliente, con visibilità, cronologia e finalità distinte. Il brief completo è in
[`Progetto-CRM-inKarma-LeadSpark.md`](Progetto-CRM-inKarma-LeadSpark.md).

## Architettura

```
            ┌──────────── stack Docker (infra/compose) ────────────┐
team ─────▶ │ Twenty server + worker ── Postgres ── Redis           │
            │      │ API REST/GraphQL (API key con ruolo "Hub")      │
            │      ▼ webhook firmati HMAC                             │
clienti ──▶ │ Hub (Fastify) ── DB "hub": event log, outbox, accessi   │
            │   ├─ /portale      area clienti (React, mobile-first)   │
            │   └─ adapter: email di servizio, import, (posta, AI)    │
            │ Mailpit: in sviluppo riceve tutte le email di servizio   │
            └─────────────────────────────────────────────────────────┘
```

| Cartella | Contenuto |
|---|---|
| [`apps/twenty-app`](apps/twenty-app) | App Twenty (twenty-sdk): oggetti (commesse, campagne, lead, consegne, esiti, opposizioni, import), ruoli, viste, navigazione, pagina **Oggi**, **Scheda di consegna**, **Anteprima import** |
| [`apps/hub`](apps/hub) | Servizio accanto a Twenty: webhook verificati, coda eventi con lease, outbox degli effetti esterni (al più una volta), portale clienti con isolamento per commessa, import CSV/XLSX |
| [`apps/portal`](apps/portal) | Area clienti in italiano (sistema visivo "Bolla"): lead consegnati, esito, storico |
| [`packages/contracts`](packages/contracts) | Contratti d'evento versionati (zod) |
| [`packages/ui-tokens`](packages/ui-tokens) | Token di design e verifica automatica dei contrasti WCAG |
| [`infra`](infra) | Docker compose, script di bootstrap, provisioning, deploy, backup e prova di ripristino |
| [`docs`](docs) | Decisioni e limiti verificati |

Scelte principali e motivazioni: [`docs/DECISIONI.md`](docs/DECISIONI.md).

## Avvio da un checkout pulito

Prerequisiti: Node ≥ 24.5 con Corepack (Yarn 4), Docker con Compose, il CLI `twenty` 2.63.0 (`npm i -g twenty@2.63.0`).

```bash
yarn install
infra/scripts/gen-env.sh                         # crea infra/compose/.env con segreti casuali
(cd infra/compose && docker compose up -d server worker db redis mailpit)
TWENTY_URL=http://localhost:33000 node infra/scripts/bootstrap-workspace.mjs   # admin + API key in .secrets/
(cd apps/twenty-app && yarn install && twenty auth login --with-token --url http://localhost:33000 && twenty app apply --create)
node infra/scripts/provision-hub.mjs              # API key "Servizio Hub" + webhook firmato → .secrets/hub.env
cp .secrets/hub.env infra/compose/hub.env
yarn build:portal && (cd infra/compose && docker compose up -d hub)
node fixtures/seed-demo.mjs                       # dati sintetici: due commesse, prospect, consegne
```

- CRM: `http://localhost:33000` (credenziali admin in `.secrets/twenty-bootstrap.json`)
- Area clienti: `http://localhost:33010/portale` (il link di accesso arriva in Mailpit, `http://localhost:33025`)

Per un server remoto, `infra/scripts/deploy.sh` pubblica il ramo corrente su un mirror git via SSH
(`CRMDEV_HOST`, default alias `crmdev`) e aggiorna lo stack. Il portale viene compilato in locale.

## Test

```bash
yarn lint && yarn typecheck && yarn test        # monorepo (Hub con PGlite e Twenty finto, nessun servizio richiesto)
(cd apps/twenty-app && yarn lint && yarn typecheck && yarn test:unit)
PORTALE_URL=https://il-tuo-dominio yarn test:e2e   # Playwright su uno stack reale (isolamento, esiti, WCAG AA)
```

Test bloccanti: un referente di una commessa non vede né modifica dati di un'altra commessa nemmeno conoscendone
l'ID (API e browser, anche se il filtro lato Twenty fallisse); webhook duplicati producono una sola notifica;
un crash durante un invio non lo ripete alla cieca.

## Stato

| Incremento | Stato |
|---|---|
| 0. Infrastruttura, matrice capacità | stack pinnato, bootstrap riproducibile, backup e prova di ripristino |
| 1. Fondazione e prima vendita | modello dati, ruoli, isolamento verificato, consegna ed esito, import con anteprima, pagina Oggi |
| 2. Email, acquisizione e AI | in corso (casella IMAP dedicata, inbox condivisa, sequenze, agenti AI via OpenRouter) |
| 3. Supporto e servizio | da fare (ticketing con SLA, area Assistenza nel portale) |

## Sicurezza

Nessun segreto nel repository: `.secrets/`, `.env*`, `*.env` e `docs/locale/` sono esclusi e la CI esegue gitleaks
su tutta la storia. In sviluppo le email di servizio sono reindirizzate a una casella di prova e gli invii
in uscita sono limitati a un elenco di domini consentiti.
