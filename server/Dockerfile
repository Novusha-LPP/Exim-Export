FROM node:20-bookworm-slim

WORKDIR /server

# Prevent Playwright from automatically downloading all browsers during npm ci
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Only copy package files first (better layer cache)
COPY package*.json ./

# Install production dependencies and clean npm cache
RUN npm ci --only=production && npm cache clean --force

# Copy rest of the code
COPY . .
COPY .env .env

EXPOSE 9002

# Use plain node in container, not nodemon
CMD ["npm", "start"]
