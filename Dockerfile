# StrangerChat 2.0 - Production Dockerfile

# Stage 1: Base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Stage 2: Dependencies
FROM base AS dependencies

# Install production dependencies (with native build for better-sqlite3)
RUN npm ci --only=production

# Stage 3: Production
FROM base AS production

# Copy production dependencies (includes pre-built native addons)
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application files
COPY src ./src
COPY server ./server
COPY public ./public
COPY .env.production .env

# Create database directory
RUN mkdir -p /app/db

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the application
CMD ["node", "server/server.js"]

# Labels for metadata
LABEL maintainer="StrangerChat Team <support@strngr.chat>"
LABEL version="2.0.0"
LABEL description="StrangerChat - Enterprise anonymous chat platform"
