FROM node:22-alpine

WORKDIR /server

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Copy environment file
COPY .env .env

EXPOSE 9002

CMD ["npm","start"]