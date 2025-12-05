FROM node:22-alpine

# Install Playwright dependencies (required for browsers)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Puppeteer to skip installing Chromium when installed post-install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /server

# Copy package files
COPY package*.json ./

# Install dependencies + Playwright browsers
RUN npm ci --only=production
RUN npx playwright install --with-deps chromium

# Copy source code
COPY . .

# Copy environment file
COPY .env .env

EXPOSE 9002

CMD ["npm", "start"]
