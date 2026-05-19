FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built output
COPY --from=builder /app/dist ./dist

# Copy and make start script executable (used by some deploy platforms)
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Create non-root user for security
RUN addgroup -S botgroup && adduser -S botuser -G botgroup
USER botuser

# Expose no ports (bot uses outbound only)
EXPOSE 0

# Health check — just verify the process is alive
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD pgrep -f "node dist/index.js" || exit 1

CMD ["sh", "./start.sh"]
