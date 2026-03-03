FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install frontend deps and build
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend ./

EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
