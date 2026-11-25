#!/usr/bin/env node
// Crea l'identità tecnica dell'Hub su Twenty: API key con ruolo "Servizio Hub" (mai Admin)
// e webhook firmato verso l'Hub. Scrive .secrets/hub.env (non versionato).
// Prerequisito: bootstrap-workspace.mjs eseguito e app Twenty installata (definisce il ruolo).
// Idempotente: se hub.env esiste non crea nulla.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SECRETS = new URL('../../.secrets/', import.meta.url);
const OUT = new URL('hub.env', SECRETS);
const boot = JSON.parse(readFileSync(new URL('twenty-bootstrap.json', SECRETS), 'utf8'));
const URL_BASE = boot.url;
// URL con cui il server Twenty raggiunge l'Hub dentro la rete Docker.
const HUB_INTERNAL_URL = process.env.HUB_INTERNAL_URL ?? 'http://hub:3010';

if (existsSync(OUT)) {
  console.log('hub.env già presente: nessuna modifica');
  process.exit(0);
}

async function gql(query, variables, token) {
  const res = await fetch(`${URL_BASE}/metadata`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '));
  return body.data;
}

const { getLoginTokenFromCredentials } = await gql(
  `mutation($email:String!,$password:String!,$origin:String!){
     getLoginTokenFromCredentials(email:$email,password:$password,origin:$origin){ loginToken{ token } } }`,
  { email: boot.adminEmail, password: boot.adminPassword, origin: URL_BASE },
);
const { getAuthTokensFromLoginToken } = await gql(
  `mutation($loginToken:String!,$origin:String!){
     getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin){ tokens{ accessOrWorkspaceAgnosticToken{ token } } } }`,
  { loginToken: getLoginTokenFromCredentials.loginToken.token, origin: URL_BASE },
);
const token = getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token;

const { getRoles } = await gql(`{ getRoles{ id label canBeAssignedToApiKeys } }`, {}, token);
const hubRole = getRoles.find((r) => r.label === 'Servizio Hub');
if (!hubRole?.canBeAssignedToApiKeys) throw new Error('Ruolo "Servizio Hub" assente: installare prima l\'app Twenty');

const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
const { createApiKey } = await gql(
  `mutation($input:CreateApiKeyInput!){ createApiKey(input:$input){ id } }`,
  { input: { name: 'hub', expiresAt, roleId: hubRole.id } },
  token,
);
const { generateApiKeyToken } = await gql(
  `mutation($apiKeyId:UUID!,$expiresAt:String!){ generateApiKeyToken(apiKeyId:$apiKeyId,expiresAt:$expiresAt){ token } }`,
  { apiKeyId: createApiKey.id, expiresAt },
  token,
);

const webhookSecret = randomBytes(32).toString('hex');
const { createWebhook } = await gql(
  `mutation($input:CreateWebhookInput!){ createWebhook(input:$input){ id } }`,
  {
    input: {
      targetUrl: `${HUB_INTERNAL_URL}/webhooks/twenty`,
      description: 'Eventi operativi verso il servizio Hub',
      operations: [
        'consegnaLead.created',
        'consegnaLead.updated',
        'feedbackLead.created',
        'appartenenza.created',
        'appartenenza.updated',
        'opposizione.created',
        'importLotto.created',
        'importLotto.updated',
        'commessa.created',
        'commessa.updated',
      ],
      roleId: hubRole.id,
      secret: webhookSecret,
    },
  },
  token,
);

writeFileSync(
  OUT,
  [
    `# Generato da infra/scripts/provision-hub.mjs il ${new Date().toISOString()}`,
    `TWENTY_API_KEY=${generateApiKeyToken.token}`,
    `TWENTY_API_KEY_ID=${createApiKey.id}`,
    `TWENTY_WEBHOOK_ID=${createWebhook.id}`,
    `TWENTY_WEBHOOK_SECRET=${webhookSecret}`,
    `SESSION_SECRET=${randomBytes(48).toString('base64url')}`,
    '',
  ].join('\n'),
  { mode: 0o600 },
);
console.log(`Identità Hub creata: API key ${createApiKey.id}, webhook ${createWebhook.id}. Segreti in .secrets/hub.env`);
