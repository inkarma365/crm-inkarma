# Hub inKarma: TypeScript eseguito direttamente da Node 24 (type stripping), nessun build step.
# Contesto di build: radice del repository.
# Il portale (apps/portal/dist) arriva già compilato da infra/scripts/deploy.sh: sulla VPS la
# sandbox ha 2,2 GB di memoria condivisi con Twenty e un build Vite + doppio yarn install l'ha saturata.
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/hub/package.json apps/hub/
COPY apps/portal/package.json apps/portal/
RUN NODE_OPTIONS=--max-old-space-size=256 yarn workspaces focus @inkarma/hub --production

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
ENV NODE_ENV=production NODE_OPTIONS=--max-old-space-size=160
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY packages/contracts packages/contracts
COPY apps/hub/package.json apps/hub/
COPY apps/hub/src apps/hub/src
COPY apps/portal/dist apps/portal/dist
WORKDIR /app/apps/hub
USER node
EXPOSE 3010
HEALTHCHECK --interval=15s --timeout=4s --retries=5 CMD wget -qO- http://127.0.0.1:3010/healthz || exit 1
CMD ["node", "src/main.ts"]
