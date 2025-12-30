#!/bin/bash
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="asia-southeast2" # Jakarta region, good for local latency
BACKEND_SERVICE_NAME="web-geo-backend"
FRONTEND_SERVICE_NAME="web-geo-frontend"

echo "Deploying to Project: $PROJECT_ID in Region: $REGION"

# 1. Enable APIs
echo "Enabling necessary APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

# 2. Deploy Backend
echo "Building and Deploying Backend..."
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/$BACKEND_SERVICE_NAME .

# Deploy to Cloud Run
# We need to replace the config URL at runtime. 
# For simplicity in this script, we'll deploy, get the URL, then update the config and redeploy or use an env var substitution script in the container.
# However, pygeoapi config is static. 
# A common trick is to use sed in the Dockerfile entrypoint.
# Let's verify if we need to do that. 
# For now, we will deploy, get URL, and rely on relative paths or CORS. 
# But pygeoapi needs 'server.url' to be correct for links.

# First deployment to get the URL (or reserved URL)
gcloud run deploy $BACKEND_SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$BACKEND_SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080

BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "Backend deployed at: $BACKEND_URL"

echo "Updating Backend configuration with public URL..."
gcloud run services update $BACKEND_SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --update-env-vars API_URL=$BACKEND_URL

cd ..

# 3. Deploy Frontend
echo "Building and Deploying Frontend..."
cd frontend


# Cloud Build doesn't easily support passing args to docker build directly via simple flag without config.
# We might need a cloudbuild.yaml or just verify if the above works.
# Actually `gcloud builds ` with standard Dockerfile checks for --build-arg.
# Wait, `gcloud builds submit` sends context. We can use `--build-arg` if we use `docker build` locally and push, OR use a custom cloudbuild.yaml.
# Simplest way for user: use `gcloud run deploy --source .` but that's for source deployment.
# Let's stick to `gcloud builds submit` but we need to pass the ARG.
# `gcloud builds submit` does NOT support --build-arg directly for local Dockerfiles easily without a config.
# Alternative: Build locally and push (requires docker auth).
# Safer Alternative: Create a simple cloudbuild.yaml on the fly.

cat > cloudbuild.yaml <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '--build-arg', 'VITE_API_URL=$BACKEND_URL', '-t', 'gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME', '.']
images:
- 'gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME'
EOF

gcloud builds submit --config cloudbuild.yaml .
rm cloudbuild.yaml

gcloud run deploy $FRONTEND_SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$FRONTEND_SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "Frontend deployed at: $FRONTEND_URL"

echo "Deployment Complete!"
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
