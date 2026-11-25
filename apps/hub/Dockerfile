# Hub inKarma: immagine minima che contiene solo artefatti già costruiti in locale (o in CI):
#   apps/hub/dist/main.mjs  bundle esbuild con tutte le dipendenze (yarn build:hub)
#   apps/portal/dist        area clienti compilata (yarn build:portal)
# Nessun yarn install nell'immagine: sulla sandbox (2,2 GB condivisi con Twenty, senza swap)
# un install dentro il build saturava la memoria e fermava lo stack. Vedi docs/DECISIONI.md.
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
ENV NODE_ENV=production NODE_OPTIONS=--max-old-space-size=160 PORTAL_DIST_DIR=/app/portal
WORKDIR /app
COPY apps/hub/dist/main.mjs ./main.mjs
COPY apps/portal/dist ./portal
USER node
EXPOSE 3010
HEALTHCHECK --interval=15s --timeout=4s --retries=5 CMD wget -qO- http://127.0.0.1:3010/healthz || exit 1
CMD ["node", "main.mjs"]
