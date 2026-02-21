FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install frontend deps
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY src ./src
COPY public ./public
COPY index.html vite.config.js ./
COPY .env* ./

RUN npm run build

# --- Production image ---
FROM node:20-alpine

WORKDIR /app

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./dist

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend ./

# Cloud Run uses port 8080
EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]
