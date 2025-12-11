FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /server

# Only copy package files first (better layer cache)
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy rest of the code
COPY . .
COPY .env .env

EXPOSE 9002

# Use plain node in container, not nodemon
CMD ["npm", "start"]
