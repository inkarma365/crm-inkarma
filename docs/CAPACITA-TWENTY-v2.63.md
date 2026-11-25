# Matrice delle capacità — Twenty v2.63.0 (self-host, edizione gratuita AGPL)

Legenda: **Provato** = verificato su questa installazione con un test o un'operazione riproducibile ·
**Documentato** = letto in docs/sorgente alla tag `twenty/v2.63.0`, non ancora esercitato · **Lacuna** = serve estensione o compromesso.

| Area | Capacità | Stato | Come lo usiamo / compromesso | Prova |
|---|---|---|---|---|
| Installazione | Docker Compose server + worker + Postgres 16 + Redis, migrazioni all'avvio | Provato | pin per tag **e** digest; `infra/compose` | avvio pulito, `healthz` 200 |
| Installazione | Variabili d'ambiente vuote rifiutate (`AI_PROVIDERS`, `LOGIC_FUNCTION_TYPE`) | Provato (lacuna) | variabili facoltative in `twenty-extra.env` opzionale | primo avvio fallito, poi corretto |
| Installazione | Un `database:init` interrotto lascia lo schema `core` vuoto e non viene ripreso | Provato (lacuna) | su installazione nuova: ricreare i volumi (documentato) | incidente al primo avvio |
| Risorse | Worker: OOM all'avvio sotto ~400 MB di heap, riavvio in loop **silenzioso** (exit 0) | Provato (lacuna) | `--max-old-space-size=700`, controllo `docker inspect` dopo ogni deploy | job e webhook fermi fino alla correzione |
| Bootstrap | Workspace, admin e API key creabili via GraphQL `/metadata` (signUp, signUpInNewWorkspace, activateWorkspace, createApiKey) | Provato | `infra/scripts/bootstrap-workspace.mjs` idempotente | eseguito su istanza vuota |
| App (SDK) | `twenty app init/apply/plan`, oggetti, campi, relazioni bidirezionali, indici, viste (TABLE/KANBAN con filtri e gruppi), navigazione con cartelle | Provato | `apps/twenty-app` | 9 oggetti + viste + menu applicati |
| App (SDK) | Tab e widget su pagine record standard (Azienda, Persona) e generate (Commessa, Lead) | Provato | due relazioni distinte su Azienda: "Cliente dell'agenzia" / "Prospect nelle campagne" | screenshot |
| App (SDK) | La prima scheda aggiunta a una pagina record viene mostrata nella colonna sinistra | Provato | Scheda di consegna sempre visibile accanto ai campi | screenshot |
| Front component | React in worker sandbox con `twenty-ui`, `useTheme`, `CoreApiClient` con i permessi dell'utente, `navigate`, `enqueueSnackbar`, `openCommandConfirmationModal` | Provato | pagina **Oggi**, **Scheda di consegna**, **Anteprima import** | navigazione "Apri" da Oggi verificata |
| Front component | genql: `__name` è il nome dell'operazione, **non** un alias | Provato (lacuna) | una query per fonte, in parallelo | errore e correzione nella pagina Oggi |
| Front component | Origine opaca, niente cookie: non può chiamare l'Hub in modo autenticato | Documentato (lacuna) | **record di comando** in Twenty → webhook → Hub | consegna, import |
| Front component | Client tipizzato generato solo da `apply` contro un server | Provato (lacuna) | helper `interroga`/`modifica` con tipi locali: typecheck in CI senza server | CI verde |
| Logic function | Disattivate di default in self-host (`LOGIC_FUNCTION_TYPE`); la health-check dello scaffold genera errori nel worker | Provato | non usate: webhook verso l'Hub | errori nel log, poi rimossa |
| Permessi | Ruoli custom per oggetto e campo (gratuiti self-host), assegnabili a utenti, API key, agenti | Provato | 6 ruoli app; API key "Servizio Hub" senza cancellazione definitiva | 403 su destroy con chiave Hub |
| Permessi | `canCreate` senza `canUpdate` → 403 in creazione | Provato (lacuna) | registri "solo aggiunta" con update concesso, immutabilità per processo + audit | e2e esiti |
| Permessi | Permessi per riga | Documentato (licenza Organization) | non usati: isolamento clienti nell'Hub (`CommessaScope`) | test bloccanti unit + e2e |
| API | REST con filtri `eq/in/and/or`, `depth`, ordinamento, cursore; batch 60 | Provato | `TwentyClient` dell'Hub | smoke test |
| Webhook | Firma HMAC-SHA256 su `timestamp:JSON`, header `X-Twenty-Webhook-*`, `eventId` stabile, payload per ruolo | Provato | dedup su `eventId`, verifica firma, 401 su firma errata | eventi reali ricevuti |
| Webhook | Protezione SSRF: host interni bloccati salvo `OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS` | Provato | consentito solo `hub` | consegne webhook verso l'Hub |
| File | Campo FILES con URL firmato in lettura; upload via `uploadFilesFieldFileByUniversalIdentifier` (deprecato) o `createFileUpload` | Provato / Documentato | import CSV/XLSX; l'Hub riscrive l'host dell'URL verso la rete interna | `tests/integration/import-reale.mjs` |
| Posta | IMAP/SMTP con `IS_IMAP_SMTP_CALDAV_ENABLED`, cartelle selezionabili, auto-creazione contatti disattivabile, visibilità per canale | Documentato | incremento 2: sola cartella `CRM-Prova`, contatti automatici disattivati | da provare |
| Posta | Invio con `sendEmail` (In-Reply-To/References) legato all'utente | Documentato | invio dall'Hub via SMTP (outbox, lock, allowlist) + APPEND nella cartella sincronizzata | da provare |
| Campagne email native | Twenty v2.63 ha un modulo "Campagne" (message campaigns) | Osservato | non usato: omonimo del nostro oggetto Campagna (cartella LeadSpark) — da distinguere nell'interfaccia | menu |
| AI | `AI_PROVIDERS` OpenAI-compatibile (OpenRouter), MCP su `/mcp` | Documentato | AI applicativa nell'Hub (provider finto finché manca la chiave) | da provare con chiave |
| Workflow | Trigger record/manuali/cron/webhook, azioni HTTP/email/AI; nessuno step di approvazione | Documentato | approvazioni come record di comando + esecutore nell'Hub | — |
| Localizzazione | UI in italiano per utente | Provato | etichette dell'app in italiano | screenshot |

Prove automatiche correlate: `yarn test` (Hub con PGlite e Twenty finto), `yarn test:e2e` (portale sul dominio),
`node tests/integration/import-reale.mjs`, `infra/scripts/restore-test.sh`, CI GitHub Actions.
