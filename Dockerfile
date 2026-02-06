FROM node:20-alpine

WORKDIR /app

# Install frontend dependencies and build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production

# Cloud Run uses port 8080
EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]
