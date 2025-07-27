# Google Cloud Production Deployment Guide for Code Duels

This guide provides step-by-step instructions for deploying the Code Duels application to Google Cloud Platform (GCP) with production-ready configurations.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Security Preparation](#security-preparation)
3. [Google Cloud Project Setup](#google-cloud-project-setup)
4. [Database Setup (Cloud SQL)](#database-setup-cloud-sql)
5. [Container Registry Setup](#container-registry-setup)
6. [Google Kubernetes Engine (GKE) Setup](#google-kubernetes-engine-gke-setup)
7. [Application Configuration Updates](#application-configuration-updates)
8. [Kubernetes Deployments](#kubernetes-deployments)
9. [Frontend Deployment](#frontend-deployment)
10. [Networking and Load Balancing](#networking-and-load-balancing)
11. [CI/CD with Cloud Build](#cicd-with-cloud-build)
12. [Monitoring and Logging](#monitoring-and-logging)
13. [Cost Optimization](#cost-optimization)
14. [Production Checklist](#production-checklist)

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- `kubectl` installed
- Docker installed locally
- Domain name for production deployment

## Security Preparation

### 1. Remove Hardcoded Secrets

Create environment configuration files:

```bash
# Create environment variables file (DO NOT COMMIT)
cat > .env.production <<EOF
FLASK_SECRET_KEY=$(openssl rand -hex 32)
DB_HOST=<CLOUD_SQL_PRIVATE_IP>
DB_PORT=5432
DB_NAME=codeduels
DB_USER=codeduels_user
DB_PASSWORD=<SECURE_PASSWORD>
JWT_SECRET_KEY=$(openssl rand -hex 32)
EOF
```

### 2. Update Flask Configuration

Create `server/config.py`:

```python
import os
from dataclasses import dataclass

@dataclass
class Config:
    SECRET_KEY: str = os.environ.get('FLASK_SECRET_KEY', 'dev-key')
    DB_HOST: str = os.environ.get('DB_HOST', 'db')
    DB_PORT: int = int(os.environ.get('DB_PORT', 5432))
    DB_NAME: str = os.environ.get('DB_NAME', 'postgres')
    DB_USER: str = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD: str = os.environ.get('DB_PASSWORD', 'password')
    
    # Security settings for production
    SESSION_COOKIE_SECURE: bool = os.environ.get('ENV') == 'production'
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'Lax'
    
class ProductionConfig(Config):
    ENV: str = 'production'
    DEBUG: bool = False
    TESTING: bool = False

class DevelopmentConfig(Config):
    ENV: str = 'development'
    DEBUG: bool = True
    TESTING: bool = False

config = {
    'production': ProductionConfig,
    'development': DevelopmentConfig
}
```

## Google Cloud Project Setup

```bash
# Set your project ID
export PROJECT_ID="codeduels-prod"
export REGION="us-central1"
export ZONE="us-central1-a"

# Create project
gcloud projects create $PROJECT_ID --name="Code Duels Production"

# Set current project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  compute.googleapis.com \
  container.googleapis.com \
  sqladmin.googleapis.com \
  cloudresourcemanager.googleapis.com \
  servicenetworking.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

# Create service account for the application
gcloud iam service-accounts create codeduels-app \
  --display-name="Code Duels Application"
```

## Database Setup (Cloud SQL)

```bash
# Create Cloud SQL instance
gcloud sql instances create codeduels-db \
  --database-version=POSTGRES_14 \
  --tier=db-g1-small \
  --region=$REGION \
  --network=default \
  --no-assign-ip

# Create database
gcloud sql databases create codeduels \
  --instance=codeduels-db

# Create database user
gcloud sql users create codeduels_user \
  --instance=codeduels-db \
  --password=<SECURE_PASSWORD>

# Get the Cloud SQL connection name
export CLOUD_SQL_CONNECTION=$(gcloud sql instances describe codeduels-db --format="value(connectionName)")
```

## Container Registry Setup

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create codeduels-repo \
  --repository-format=docker \
  --location=$REGION \
  --description="Code Duels container images"

# Configure docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

## Google Kubernetes Engine (GKE) Setup

```bash
# Create GKE cluster with necessary features
gcloud container clusters create codeduels-cluster \
  --zone=$ZONE \
  --num-nodes=3 \
  --machine-type=n2-standard-4 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-stackdriver-kubernetes \
  --addons=HttpLoadBalancing,HorizontalPodAutoscaling

# Get cluster credentials
gcloud container clusters get-credentials codeduels-cluster --zone=$ZONE

# Create namespace
kubectl create namespace codeduels-prod
```

### Configure Node Pool for Code Execution

```bash
# Create a separate node pool for code execution with security restrictions
gcloud container node-pools create code-execution-pool \
  --cluster=codeduels-cluster \
  --zone=$ZONE \
  --machine-type=n2-standard-2 \
  --num-nodes=2 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=5 \
  --node-taints=code-execution=true:NoSchedule \
  --node-labels=workload-type=code-execution
```

## Application Configuration Updates

### 1. Update Backend Dockerfile for Production

Create `server/Dockerfile.prod`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--worker-class", "eventlet", "-w", "1", "app:app"]
```

### 2. Update Frontend for Production

Create `client/.env.production`:

```env
REACT_APP_API_URL=https://api.codeduels.com
REACT_APP_SOCKET_URL=wss://api.codeduels.com
```

Update `client/src/config/api.js`:

```javascript
const getApiHost = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5001';
    }
    
    return `https://${hostname}`;
};

export const API_HOST = getApiHost();
export const SOCKET_HOST = process.env.REACT_APP_SOCKET_URL || API_HOST;
```

## Kubernetes Deployments

### 1. Create Secrets

```bash
# Create database secret
kubectl create secret generic db-credentials \
  --from-literal=username=codeduels_user \
  --from-literal=password=<DB_PASSWORD> \
  --namespace=codeduels-prod

# Create app secrets
kubectl create secret generic app-secrets \
  --from-literal=flask-secret-key=$(openssl rand -hex 32) \
  --from-literal=jwt-secret-key=$(openssl rand -hex 32) \
  --namespace=codeduels-prod
```

### 2. Backend Deployment

Create `k8s/backend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codeduels-backend
  namespace: codeduels-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: codeduels-backend
  template:
    metadata:
      labels:
        app: codeduels-backend
    spec:
      serviceAccountName: codeduels-app
      containers:
      - name: backend
        image: ${REGION}-docker.pkg.dev/${PROJECT_ID}/codeduels-repo/backend:latest
        ports:
        - containerPort: 5001
        env:
        - name: ENV
          value: "production"
        - name: DB_HOST
          value: "127.0.0.1"
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: "codeduels"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: FLASK_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: flask-secret-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5001
          initialDelaySeconds: 5
          periodSeconds: 5
      - name: cloud-sql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:latest
        command:
          - "/cloud_sql_proxy"
          - "-instances=${CLOUD_SQL_CONNECTION}=tcp:5432"
        securityContext:
          runAsNonRoot: true
```

### 3. Code Execution Deployment

Create `k8s/code-executor-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: code-executor
  namespace: codeduels-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: code-executor
  template:
    metadata:
      labels:
        app: code-executor
    spec:
      nodeSelector:
        workload-type: code-execution
      tolerations:
      - key: code-execution
        operator: Equal
        value: "true"
        effect: NoSchedule
      securityContext:
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: docker-daemon
        image: docker:dind
        securityContext:
          privileged: true
        volumeMounts:
        - name: docker-graph-storage
          mountPath: /var/lib/docker
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: docker-graph-storage
        emptyDir: {}
```

### 4. Backend Service

Create `k8s/backend-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: codeduels-backend
  namespace: codeduels-prod
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    cloud.google.com/backend-config: '{"default": "codeduels-backend-config"}'
spec:
  type: NodePort
  ports:
  - port: 5001
    targetPort: 5001
    protocol: TCP
  selector:
    app: codeduels-backend
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

### 5. Backend Config for WebSockets

Create `k8s/backend-config.yaml`:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: codeduels-backend-config
  namespace: codeduels-prod
spec:
  timeoutSec: 3600
  connectionDraining:
    drainingTimeoutSec: 60
  sessionAffinity:
    affinityType: "CLIENT_IP"
    affinityCookieTtlSec: 3600
```

## Frontend Deployment

### 1. Build and Deploy Frontend to Cloud Storage

```bash
# Build production frontend
cd client
npm run build

# Create Cloud Storage bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://codeduels-frontend/

# Enable public access
gsutil iam ch allUsers:objectViewer gs://codeduels-frontend

# Upload build files
gsutil -m rsync -r -d build/ gs://codeduels-frontend/

# Set up proper caching
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" gs://codeduels-frontend/static/**/*
gsutil -m setmeta -h "Cache-Control:no-cache" gs://codeduels-frontend/index.html

# Configure as website
gsutil web set -m index.html -e index.html gs://codeduels-frontend
```

### 2. Set up Cloud CDN

```bash
# Create backend bucket
gcloud compute backend-buckets create codeduels-frontend-bucket \
  --gcs-bucket-name=codeduels-frontend \
  --enable-cdn

# Create URL map
gcloud compute url-maps create codeduels-url-map \
  --default-backend-bucket=codeduels-frontend-bucket

# Create HTTPS proxy
gcloud compute target-https-proxies create codeduels-https-proxy \
  --url-map=codeduels-url-map \
  --ssl-certificates=codeduels-ssl-cert

# Create forwarding rule
gcloud compute forwarding-rules create codeduels-https-rule \
  --global \
  --target-https-proxy=codeduels-https-proxy \
  --ports=443
```

## Networking and Load Balancing

### 1. Create Ingress for Backend API

Create `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: codeduels-ingress
  namespace: codeduels-prod
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "codeduels-api-ip"
    networking.gke.io/managed-certificates: "codeduels-api-cert"
    kubernetes.io/ingress.allow-http: "false"
spec:
  rules:
  - host: api.codeduels.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: codeduels-backend
            port:
              number: 5001
```

### 2. Create Managed Certificate

Create `k8s/managed-cert.yaml`:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: codeduels-api-cert
  namespace: codeduels-prod
spec:
  domains:
  - api.codeduels.com
```

### 3. Reserve Static IPs

```bash
# Reserve IP for API
gcloud compute addresses create codeduels-api-ip --global

# Get the IP address
gcloud compute addresses describe codeduels-api-ip --global --format="value(address)"
```

## CI/CD with Cloud Build

### 1. Create Cloud Build Configuration

Create `cloudbuild.yaml`:

```yaml
steps:
# Build backend image
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/codeduels-repo/backend:${SHORT_SHA}', '-f', 'server/Dockerfile.prod', './server']

# Push backend image
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/codeduels-repo/backend:${SHORT_SHA}']

# Deploy to GKE
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    gcloud container clusters get-credentials codeduels-cluster --zone=${_ZONE}
    kubectl set image deployment/codeduels-backend backend=${_REGION}-docker.pkg.dev/${PROJECT_ID}/codeduels-repo/backend:${SHORT_SHA} -n codeduels-prod
    kubectl rollout status deployment/codeduels-backend -n codeduels-prod

# Build and deploy frontend
- name: 'node:18'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    cd client
    npm ci
    npm run build
  env:
  - 'REACT_APP_API_URL=https://api.codeduels.com'
  - 'REACT_APP_SOCKET_URL=wss://api.codeduels.com'

- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    gsutil -m rsync -r -d client/build/ gs://codeduels-frontend/
    gsutil -m setmeta -h "Cache-Control:public, max-age=3600" gs://codeduels-frontend/static/**/*
    gsutil -m setmeta -h "Cache-Control:no-cache" gs://codeduels-frontend/index.html

substitutions:
  _REGION: us-central1
  _ZONE: us-central1-a

options:
  machineType: 'N1_HIGHCPU_8'
```

### 2. Set up Build Trigger

```bash
# Connect GitHub repository
gcloud beta builds triggers create github \
  --repo-name=codeduels \
  --repo-owner=<YOUR_GITHUB_USERNAME> \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

## Monitoring and Logging

### 1. Create Monitoring Dashboard

```bash
# Create custom dashboard
cat > dashboard.json <<EOF
{
  "displayName": "Code Duels Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"kubernetes.io/ingress/request_count\" resource.type=\"k8s_ingress\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Error Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"logging.googleapis.com/user/error_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=dashboard.json
```

### 2. Set up Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=<CHANNEL_ID> \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 1%" \
  --condition-expression='
    fetch k8s_container
    | metric "logging.googleapis.com/user/error_count"
    | align rate(1m)
    | group_by [resource.cluster_name, resource.namespace_name]
    | condition val() > 0.01
  '
```

### 3. Configure Log-Based Metrics

```bash
# Create log-based metric for code execution times
gcloud logging metrics create code_execution_time \
  --description="Code execution duration" \
  --value-extractor='EXTRACT(jsonPayload.execution_time)' \
  --log-filter='resource.type="k8s_container"
    jsonPayload.event="code_execution"'
```

## Cost Optimization

### 1. Set up Autoscaling

```bash
# Configure horizontal pod autoscaling
kubectl autoscale deployment codeduels-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  --namespace=codeduels-prod

# Configure vertical pod autoscaling
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: codeduels-backend-vpa
  namespace: codeduels-prod
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: codeduels-backend
  updatePolicy:
    updateMode: "Auto"
EOF
```

### 2. Set up Resource Quotas

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: codeduels-quota
  namespace: codeduels-prod
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    persistentvolumeclaims: "10"
EOF
```

## Production Checklist

### Pre-deployment
- [ ] All secrets moved to Secret Manager
- [ ] Database passwords changed from defaults
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] Backup strategy implemented
- [ ] Security scan completed

### Deployment
- [ ] Database migrated to Cloud SQL
- [ ] Backend deployed to GKE
- [ ] Frontend deployed to Cloud Storage
- [ ] Load balancer configured
- [ ] WebSocket connectivity tested
- [ ] Code execution sandbox tested

### Post-deployment
- [ ] Monitoring dashboards active
- [ ] Alerts configured
- [ ] Log aggregation working
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Disaster recovery tested

### Performance Optimization
- [ ] CDN cache headers optimized
- [ ] Database indexes reviewed
- [ ] Connection pooling configured
- [ ] Autoscaling policies tuned
- [ ] Resource limits optimized

## Security Hardening

### 1. Network Policies

Create `k8s/network-policy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: codeduels-network-policy
  namespace: codeduels-prod
spec:
  podSelector:
    matchLabels:
      app: codeduels-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ingress-nginx
    ports:
    - protocol: TCP
      port: 5001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: cloud-sql-proxy
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: code-executor
```

### 2. Pod Security Policies

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: codeduels-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check session affinity configuration
   - Verify ingress timeout settings
   - Ensure CORS headers are correct

2. **Code Execution Timeouts**
   - Increase resource limits for code-executor pods
   - Check Docker daemon health
   - Monitor node pool capacity

3. **Database Connection Issues**
   - Verify Cloud SQL proxy is running
   - Check network policies
   - Ensure service account permissions

### Debug Commands

```bash
# Check pod logs
kubectl logs -f deployment/codeduels-backend -n codeduels-prod

# Check ingress status
kubectl describe ingress codeduels-ingress -n codeduels-prod

# Test WebSocket connection
wscat -c wss://api.codeduels.com/socket.io/?EIO=4&transport=websocket

# Check SSL certificate status
gcloud compute ssl-certificates describe codeduels-api-cert

# Monitor resource usage
kubectl top pods -n codeduels-prod
```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check resource utilization
   - Update dependencies

2. **Monthly**
   - Security patches
   - Performance optimization
   - Cost review

3. **Quarterly**
   - Disaster recovery drill
   - Security audit
   - Architecture review

This completes the comprehensive deployment guide for running Code Duels on Google Cloud Platform with production-ready configurations.