# PubKit Docker Build & Publish

## Goal

Containerize PubKit (Vue 3 + Vite SPA) and publish a `septalfauzan/pub-kit` image to Docker Hub when a `v*` git tag is pushed. Tag-based release only — no `latest` tag.

## Scope

Three files:

1. `Dockerfile` — multi-stage build
2. `.dockerignore`
3. `.github/workflows/docker-publish.yml`

## Dockerfile

Multi-stage:

- **Stage 1 (build):** `node:22-alpine` (matches project `engines.node`), corepack-enable `pnpm`, install deps, `pnpm build` producing `dist/`.
- **Stage 2 (serve):** `nginx:alpine`, copy `dist/` to `/usr/share/nginx/html`, serve on port 80.

No custom nginx.conf needed — SPA fallback for `vue-router` handled by default nginx config via a `try_files` include. Keep default minimal; add `try_files $uri /index.html` in an nginx config file only if SPA routing breaks (out of scope for this design unless user confirms). Vue Router is installed (history mode assumed), so a small `nginx.conf` with `try_files` is included to guarantee deep-link refresh works.

## .dockerignore

Exclude `node_modules`, `dist`, `test-results`, `playwright-report`, `e2e`, `.git`, `*.log`, editor/OS junk.

## CI/CD (`docker-publish.yml`)

- **Trigger:** push of tag matching `v*`.
- **Job:** `build-publish`
  - Checkout
  - Set up Docker Buildx (`docker/setup-buildx-action`)
  - Login to Docker Hub (`docker/login-action`) using secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`
  - Build & push (`docker/build-push-action`):
    - context `.`
    - image `septalfauzan/pub-kit`
    - tag: strip `v` from ref → e.g. tag `v1.0.0` → image tag `1.0.0`
  - Cache from/to GH Actions cache (`type=gha`)

No `latest` tag; versioned tags only.

## Secrets Required

- `DOCKERHUB_USERNAME` (e.g. `septalfauzan`)
- `DOCKERHUB_TOKEN` (personal access token with push access)

## Success Criteria

- `docker build` succeeds locally.
- Pushing tag `vX.Y.Z` triggers workflow, builds, and pushes `septalfauzan/pub-kit:X.Y.Z` to Docker Hub.
- SPA `vue-router` routes work on deep-link refresh in the container.
