# StrangerChat 2.0 - Deployment & DevOps Guide

## 1. LOCAL DEVELOPMENT SETUP

### 1.1 Docker Compose (Complete Stack)

```yaml
# docker-compose.yml

version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: strangerchat_db
    environment:
      POSTGRES_USER: strangerchat
      POSTGRES_PASSWORD: dev_password_123
      POSTGRES_DB: strangerchat_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U strangerchat"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: strangerchat_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Elasticsearch (for user search/discovery)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    container_name: strangerchat_es
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200 | grep -q 'cluster_name'"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend Server
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: strangerchat_backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://strangerchat:dev_password_123@postgres:5432/strangerchat_dev
      REDIS_URL: redis://redis:6379
      ELASTICSEARCH_URL: http://elasticsearch:9200
      JWT_SECRET: dev_jwt_secret_change_in_prod
      STRIPE_SECRET_KEY: sk_test_...
      PERSPECTIVE_API_KEY: your_api_key
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - /app/node_modules
    command: npm run dev
    networks:
      - strangerchat_network

  # Frontend (Next.js Dev Server)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: strangerchat_frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
      NEXT_PUBLIC_SOCKET_URL: ws://localhost:3000
    ports:
      - "3001:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
    networks:
      - strangerchat_network

volumes:
  postgres_data:
  redis_data:
  es_data:

networks:
  strangerchat_network:
    driver: bridge
```

**Start everything:**
```bash
docker-compose up -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop everything
docker-compose down
```

---

## 2. DOCKER IMAGES

### 2.1 Backend Dockerfile (Multi-stage)

```dockerfile
# Dockerfile (Backend)

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### 2.2 Frontend Dockerfile (Next.js)

```dockerfile
# frontend/Dockerfile (Multi-stage production build)

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

**Build & Push to Registry:**
```bash
# Backend
docker build -t ghcr.io/strangerchat/backend:latest .
docker push ghcr.io/strangerchat/backend:latest

# Frontend
docker build -t ghcr.io/strangerchat/frontend:latest ./frontend
docker push ghcr.io/strangerchat/frontend:latest
```

---

## 3. KUBERNETES DEPLOYMENT

### 3.1 Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: strangerchat
  labels:
    name: strangerchat

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: strangerchat
data:
  NODE_ENV: "production"
  REDIS_URL: "redis://redis-service:6379"
  ELASTICSEARCH_URL: "http://elasticsearch-service:9200"

---
# k8s/secrets.yaml (Create with: kubectl create secret...)
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: strangerchat
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres-service:5432/strangerchat"
  JWT_SECRET: "your_jwt_secret_here"
  STRIPE_SECRET_KEY: "sk_live_..."
  PERSPECTIVE_API_KEY: "your_key"

---
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: strangerchat
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: backend
        image: ghcr.io/strangerchat/backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 3000
          name: websocket
          protocol: TCP
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        envFrom:
        - configMapRef:
            name: backend-config
        - secretRef:
            name: backend-secrets

---
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: strangerchat
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800

---
# k8s/backend-hpa.yaml (Auto-scaling)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: strangerchat
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
# k8s/ingress.yaml (Nginx Ingress)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: strangerchat-ingress
  namespace: strangerchat
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/enable-cors: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - strangerchat.com
    - api.strangerchat.com
    secretName: strangerchat-tls
  rules:
  - host: strangerchat.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 3000
  - host: api.strangerchat.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3000
```

**Deploy to Kubernetes:**
```bash
# Create secrets
kubectl create secret generic backend-secrets \
  --from-literal=DATABASE_URL='...' \
  --from-literal=JWT_SECRET='...' \
  -n strangerchat

# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-hpa.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n strangerchat
kubectl logs -f deployment/backend -n strangerchat
```

---

## 4. CI/CD PIPELINE (GitHub Actions)

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Build & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: strangerchat

jobs:
  test:
    runs-on: ubuntu-latest
    name: Test & Lint
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Unit tests
        run: npm run test:unit
      
      - name: Integration tests
        run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    name: Build Docker Images
    needs: test
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}/backend
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ github.repository }}/backend:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ github.repository }}/backend:buildcache,mode=max
      
      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          dockerfile: ./frontend/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ github.repository }}/frontend:${{ github.sha }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ github.repository }}/frontend:buildcache

  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Kubernetes
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'
      
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG }}" | base64 --decode > $HOME/.kube/config
          chmod 600 $HOME/.kube/config
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/backend backend=${{ env.REGISTRY }}/${{ github.repository }}/backend:${{ github.sha }} -n strangerchat
          kubectl set image deployment/frontend frontend=${{ env.REGISTRY }}/${{ github.repository }}/frontend:${{ github.sha }} -n strangerchat
          kubectl rollout status deployment/backend -n strangerchat
          kubectl rollout status deployment/frontend -n strangerchat
      
      - name: Verify deployment
        run: |
          kubectl get pods -n strangerchat
          kubectl logs -l app=backend -n strangerchat --tail=20
      
      - name: Notify Slack
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ StrangerChat deployed successfully"}'

  e2e-tests:
    runs-on: ubuntu-latest
    name: E2E Tests (Production)
    needs: deploy
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Playwright
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          BASE_URL: https://strangerchat.com
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 5. MONITORING & OBSERVABILITY

### 5.1 DataDog Monitoring

```typescript
// src/monitoring/datadog.ts

import tracer from 'dd-trace';

// Initialize tracer
tracer.init({
  service: 'strangerchat-backend',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  logInjection: true,
  profiling: {
    enabled: true,
    sampleRate: 0.1
  }
});

// Custom metrics
const statsd = require('node-statsd').StatsD;
export const metrics = new statsd();

// Usage in code
export function trackSocketEvent(eventName: string, duration: number) {
  metrics.increment(`socket.${eventName}`, 1, ['service:backend']);
  metrics.histogram(`socket.${eventName}.latency`, duration, ['service:backend']);
}
```

### 5.2 Prometheus Metrics

```yaml
# k8s/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: strangerchat-backend
  namespace: strangerchat
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

### 5.3 Alerts (PagerDuty)

```yaml
# alerts.yaml
groups:
  - name: StrangerChat
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      annotations:
        summary: "High error rate detected"
    
    - alert: LowUptime
      expr: up{job="backend"} == 0
      for: 1m
      annotations:
        summary: "Backend service down"
    
    - alert: HighLatency
      expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
      for: 10m
      annotations:
        summary: "High p95 latency"
```

---

## 6. DATABASE MIGRATIONS

### 6.1 Migration Scripts

```typescript
// migrations/001_initial_schema.sql

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at TIMESTAMP DEFAULT NOW(),
    end_at TIMESTAMP
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_session_created (session_id, created_at DESC)
);

-- ... more tables

-- Run migrations
-- npx migrate create -m initial_schema
-- npx migrate up
```

---

## 7. BACKUP & DISASTER RECOVERY

### 7.1 PostgreSQL Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/strangerchat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Full backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  gzip > $BACKUP_DIR/full_backup_$TIMESTAMP.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/full_backup_$TIMESTAMP.sql.gz \
  s3://strangerchat-backups/

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Log to monitoring
echo "Backup completed: full_backup_$TIMESTAMP.sql.gz" | \
  logger -t strangerchat-backup
```

**Cron job:**
```bash
0 2 * * * /opt/backups/backup.sh  # Daily at 2 AM
```

---

**Last Updated**: 2026-01-16  
**Owner**: DevOps / Infrastructure  
**Version**: 1.0
