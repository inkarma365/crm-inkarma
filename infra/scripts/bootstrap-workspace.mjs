#!/usr/bin/env node
// Crea in modo riproducibile il workspace agenzia su un'istanza Twenty vuota:
// utente amministratore, workspace "inKarma", API key con ruolo Admin per il CLI.
// Uso: TWENTY_URL=http://localhost:33000 node infra/scripts/bootstrap-workspace.mjs
// Scrive i segreti in .secrets/twenty-bootstrap.json (non versionato, permessi 600).
// Idempotente: se il file esiste ed è valido, non fa nulla.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL_BASE = process.env.TWENTY_URL ?? 'http://localhost:33000';
const OUT = new URL('../../.secrets/twenty-bootstrap.json', import.meta.url);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@inkarma.test';

async function gql(endpoint, query, variables, token) {
  const res = await fetch(`${URL_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`${endpoint}: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  return body.data;
}

if (existsSync(OUT)) {
  const prev = JSON.parse(readFileSync(OUT, 'utf8'));
  const res = await fetch(`${URL_BASE}/rest/companies?limit=1`, {
    headers: { authorization: `Bearer ${prev.apiKey}` },
  });
  if (res.ok) {
    console.log('Workspace già inizializzato: API key valida.');
    process.exit(0);
  }
  console.error(`File segreti presente ma API key non valida (HTTP ${res.status}). Rimuovilo per rifare il bootstrap.`);
  process.exit(1);
}

const password = randomBytes(18).toString('base64url');

const { signUp } = await gql(
  'metadata',
  `mutation($email:String!,$password:String!,$locale:String){
     signUp(email:$email,password:$password,locale:$locale){
       tokens{ accessOrWorkspaceAgnosticToken{ token } } } }`,
  { email: ADMIN_EMAIL, password, locale: 'it-IT' },
);
const agnosticToken = signUp.tokens.accessOrWorkspaceAgnosticToken.token;

const { signUpInNewWorkspace } = await gql(
  'metadata',
  `mutation($input:SignUpInNewWorkspaceInput){
     signUpInNewWorkspace(input:$input){ loginToken{ token } workspace{ id } } }`,
  { input: { displayName: 'inKarma' } },
  agnosticToken,
);

const { getAuthTokensFromLoginToken } = await gql(
  'metadata',
  `mutation($loginToken:String!,$origin:String!){
     getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin){
       tokens{ accessOrWorkspaceAgnosticToken{ token } } } }`,
  { loginToken: signUpInNewWorkspace.loginToken.token, origin: URL_BASE },
);
const accessToken = getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token;

await gql('metadata', `mutation{ activateWorkspace(data:{}){ id } }`, {}, accessToken);

const { getRoles } = await gql('metadata', `{ getRoles{ id label canBeAssignedToApiKeys } }`, {}, accessToken);
const adminRole = getRoles.find((r) => r.label === 'Admin' && r.canBeAssignedToApiKeys);
if (!adminRole) throw new Error(`Ruolo Admin non trovato: ${getRoles.map((r) => r.label).join(', ')}`);

const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
const { createApiKey } = await gql(
  'metadata',
  `mutation($input:CreateApiKeyInput!){ createApiKey(input:$input){ id } }`,
  { input: { name: 'cli-bootstrap', expiresAt, roleId: adminRole.id } },
  accessToken,
);
const { generateApiKeyToken } = await gql(
  'metadata',
  `mutation($apiKeyId:UUID!,$expiresAt:String!){ generateApiKeyToken(apiKeyId:$apiKeyId,expiresAt:$expiresAt){ token } }`,
  { apiKeyId: createApiKey.id, expiresAt },
  accessToken,
);

mkdirSync(new URL('../../.secrets/', import.meta.url), { recursive: true, mode: 0o700 });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      url: URL_BASE,
      workspaceId: signUpInNewWorkspace.workspace.id,
      adminEmail: ADMIN_EMAIL,
      adminPassword: password,
      adminRoleId: adminRole.id,
      apiKeyId: createApiKey.id,
      apiKey: generateApiKeyToken.token,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(`Workspace inKarma creato (${signUpInNewWorkspace.workspace.id}). Segreti in .secrets/twenty-bootstrap.json`);
