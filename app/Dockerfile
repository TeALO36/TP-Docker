#Étape 1 : dépendances de production
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

#Étape 2 : image finale minimale
FROM node:22-alpine AS runner

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

#Conteneur non-root : bonne pratique de sécurité.
RUN addgroup -S app && adduser -S -G app app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY views ./views
COPY public ./public

USER app
EXPOSE 3000

#Docker sait ainsi si l'app répond vraiment (et Compose peut attendre).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "src/server.js"]
