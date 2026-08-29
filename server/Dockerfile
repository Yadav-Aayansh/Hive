FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && chown -R node:node /app

COPY --from=builder --chown=node:node /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]
