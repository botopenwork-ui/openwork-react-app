FROM node:20-alpine

WORKDIR /app

# Copy pre-built frontend dist (built locally - clean, no placeholders)
COPY dist ./dist

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend ./

EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
