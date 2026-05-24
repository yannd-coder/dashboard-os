# Multi-stage build : Docker fait tout (npm install + vite build + nginx)
# → pas besoin de Node.js sur le VPS, pas besoin de pré-builder le dist/

# Stage 1 — Build des assets Vite
FROM node:20-alpine AS builder
WORKDIR /app

# Copie d'abord les manifests pour profiter du cache Docker
COPY package.json package-lock.json* ./
RUN npm ci

# Puis le reste du code source
COPY . .

# Build Vite (produit /app/dist)
RUN npm run build

# Stage 2 — Nginx léger qui sert /app/dist
FROM nginx:1.27-alpine

# Config SPA (try_files vers index.html + cache statique long)
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf

# Récupère uniquement le dossier dist du stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck : Nginx doit servir / avec un 200
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
