FROM node:20-bookworm-slim

WORKDIR /server

# Prevent Playwright from automatically downloading all browsers during npm ci
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Only copy package files first (better layer cache)
COPY package*.json ./

# Install production dependencies and clean npm cache
RUN npm ci --only=production && npm cache clean --force

# Install only Chromium and its system dependencies, then clean all apt, tmp, and npm/playwright cache to save space
RUN npx playwright install --with-deps chromium && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /root/.cache /root/.npm

# Copy rest of the code
COPY . .
COPY .env .env

EXPOSE 9002

# Use plain node in container, not nodemon
CMD ["npm", "start"]
