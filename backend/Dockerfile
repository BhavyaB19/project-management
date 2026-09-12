FROM node:22-alpine

WORKDIR /app

# Install dependencies required for Alpine
RUN apk add --no-cache openssl

# Copy package descriptors
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose backend API and WebSocket port
EXPOSE 3000

# Start server with tsx
CMD ["npm", "run", "dev"]
