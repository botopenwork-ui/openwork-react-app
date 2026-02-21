FROM node:20-alpine

WORKDIR /app

# Copy pre-built frontend dist (built locally with correct env vars baked in)
COPY dist ./dist

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend ./

# Cloud Run uses port 8080
EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]
