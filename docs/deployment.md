# Deployment - Cloud Run

Pulsefile ships as a single Docker image deployable to Cloud Run.

## Prerequisites

- A Google Cloud project with billing enabled.
- `gcloud` CLI authenticated to that project.
- Artifact Registry repo (or use Container Registry).

## Build

Locally:

```bash
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo dev) -t pulsefile:local .
docker run --rm -p 8080:8080 pulsefile:local
```

For Cloud Run, build via Cloud Build (uses the repo's Dockerfile automatically):

```bash
gcloud builds submit \
  --tag $REGION-docker.pkg.dev/$PROJECT/pulsefile/pulsefile:latest .
```

## Deploy

```bash
gcloud run deploy pulsefile \
  --image $REGION-docker.pkg.dev/$PROJECT/pulsefile/pulsefile:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 --memory 512Mi \
  --concurrency 80 \
  --min-instances 0 \
  --set-env-vars LOG_LEVEL=info,MAX_REDIRECT_HOPS=10,CHECK_TIMEOUT_MS=4000
```

## Verify

```bash
SERVICE_URL=$(gcloud run services describe pulsefile --region $REGION --format 'value(status.url)')
curl -s $SERVICE_URL/healthz
curl -s -X POST $SERVICE_URL/api/pulse \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.cloudflare.com"}' | jq '.composite'
```

## Logs

Cloud Run captures stdout JSON automatically. Filter in the Console:

```
resource.type="cloud_run_revision"
resource.labels.service_name="pulsefile"
jsonPayload.route="pulse"
```
