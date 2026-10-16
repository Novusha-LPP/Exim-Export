# Stage 1: Build the React / Vite application
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_STRING=/api
ARG VITE_IMPORT_API_STRING=https://eximbot.alvision.in/import/api
ARG VITE_VERSION=12-10-01
ARG VITE_TALLY_KEY=03c132e8da9d30732371f56fdb337ce564011287ca41a1725c5bd2a368dff5e4

# Export build args to environment for Vite bundling
ENV VITE_API_STRING=$VITE_API_STRING
ENV VITE_IMPORT_API_STRING=$VITE_IMPORT_API_STRING
ENV VITE_VERSION=$VITE_VERSION
ENV VITE_TALLY_KEY=$VITE_TALLY_KEY
ENV FAST_REFRESH=false
ENV GENERATE_SOURCEMAP=false

# Layer caching: copy package files first
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Compile optimized production bundle
RUN npm run build

# Stage 2: Production Nginx web server
FROM nginx:alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx reverse proxy & SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
