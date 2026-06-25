FROM node:20-bookworm-slim

WORKDIR /server

# Only copy package files first (better layer cache)
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Install only Chromium and its system dependencies
RUN npx playwright install --with-deps chromium

# Copy rest of the code
COPY . .
COPY .env .env

EXPOSE 9002

# Use plain node in container, not nodemon
CMD ["npm", "start"]
