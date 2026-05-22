FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY prisma ./prisma
RUN npm run prisma:generate

COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm run build

ENV NODE_ENV=production
ENV PORT=4100
ENV UPLOADS_DIR=/var/lib/landlord-housing/uploads
ENV ALLOW_MEMORY_FALLBACK_ON_DB_ERROR=false

EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD wget -q -T 3 --spider http://localhost:${PORT}/health || exit 1

CMD ["npm", "run", "start"]
