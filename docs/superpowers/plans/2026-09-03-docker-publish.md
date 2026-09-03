# Docker Build & Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize the PubKit Vue 3 + Vite SPA with a multi-stage Dockerfile and add GitHub Actions CI/CD that builds and pushes `septalfauzan/pub-kit:<version>` to Docker Hub when a `v*` git tag is pushed.

**Architecture:** Two-stage Dockerfile. Stage 1 (`node:22-alpine`) installs deps with pnpm and runs `pnpm build` to produce the static `dist/`. Stage 2 (`nginx:alpine`) serves `dist/` on port 80 with a small nginx.conf providing SPA history-mode fallback. A tag-triggered GitHub Actions workflow uses Buildx + the official Docker actions to build and push a versioned image (no `latest`).

**Tech Stack:** Docker, Buildx, GitHub Actions, pnpm, nginx, Vue/Vite SPA.

## Global Constraints

- Node version: `^22.18.0 || >=24.12.0` (from `package.json` `engines`). Use `node:22-alpine` build stage.
- Package manager: pnpm (lockfile v9 at `pnpm-lock.yaml`). No `packageManager` field in `package.json` — pin pnpm in the Dockerfile via corepack for reproducibility.
- Image name: `septalfauzan/pub-kit`.
- Tag strategy: versioned tags only. Git tag `v1.0.0` → image tag `1.0.0`. **NO `latest` tag.**
- Workflow trigger: push of tags matching `v*`.
- Runtime: SPA needs history-mode fallback so deep-link refreshes work (vue-router in history mode).
- Do not add comments to code unless asked.

---
## File Structure

- `Dockerfile` — multi-stage build (build + nginx serve)
- `.dockerignore` — exclude build artifacts, deps, tools, tests from build context
- `nginx.conf` — SPA fallback config (copied into nginx image)
- `.github/workflows/docker-publish.yml` — CI/CD workflow

---

### Task 1: Containerization files (Dockerfile, .dockerignore, nginx.conf)

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `nginx.conf`

**Interfaces:**
- Produces: A buildable image `septalfauzan/pub-kit` constructed from the repo root. The workflow in Task 2 references Dockerfile at context `.` and expects the image to serve the SPA on port 80.

- [ ] **Step 1: Create `.dockerignore`**

Create file `.dockerignore` at repo root:

```gitignore
node_modules
dist
dist-ssr
coverage
test-results
playwright-report
e2e
.git
.gitignore
*.log
.DS_Store
.vscode
.idea
```

- [ ] **Step 2: Create `nginx.conf`**

Create file `nginx.conf` at repo root:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

- [ ] **Step 3: Create `Dockerfile`**

Create file `Dockerfile` at repo root:

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
```

- [ ] **Step 4: Verify Docker build locally**

Run: `docker build -t septalfauzan/pub-kit:test .`

Expected: Build succeeds. `pnpm install --frozen-lockfile` and `pnpm build` complete without error, final stage copies `dist/`.

- [ ] **Step 5: Smoke-test the image**

Run:
```bash
docker run -d -p 8080:80 --name pubkit-test septalfauzan/pub-kit:test
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/some/deep/link
docker rm -f pubkit-test
```

Expected: Both curls return `200`. (Deep link returns 200 due to `try_files ... /index.html`.)

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore nginx.conf
git commit -m "feat: add multi-stage Dockerfile and nginx SPA config"
```

---

### Task 2: CI/CD workflow

**Files:**
- Create: `.github/workflows/docker-publish.yml`

**Interfaces:**
- Consumes: Dockerfile + `dist/` from `pnpm build` (Task 1), Git tag `v*` push.
- Produces: Publishes `septalfauzan/pub-kit:<version>` to Docker Hub. Requires secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` to be set in the GitHub repo (documented, not created here).

- [ ] **Step 1: Create the workflow file**

Create file `.github/workflows/docker-publish.yml` at repo root:

```yaml
name: Docker Build and Publish

on:
  push:
    tags:
      - "v*"

jobs:
  build-publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract version from git tag
        id: meta
        run: echo "VERSION=${GITHUB_REF_NAME#v}" >> "$GITHUB_OUTPUT"

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: septalfauzan/pub-kit:${{ steps.meta.outputs.VERSION }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Verify YAML validity**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/docker-publish.yml')); print('valid yaml')"`

Expected: prints `valid yaml`. (If `pyyaml` not installed, validate by inspection instead — ensure consistent 2-space indentation under `steps:` and `with:`.)

- [ ] **Step 3: Document required secrets (README note)**

Add a short section to `README.md` documenting the two required GitHub Action secrets so anyone configuring CI knows them.

Append to `README.md`:

```markdown
## Docker Deployment

Push a `v*` git tag to trigger the GitHub Action which builds and publishes the image to Docker Hub as `septalfauzan/pub-kit:<version>` (versioned tags only, no `latest`).

Required repository secrets:
- `DOCKERHUB_USERNAME` — Docker Hub username (e.g. `septalfauzan`)
- `DOCKERHUB_TOKEN` — Docker Hub personal access token with push permissions

Local build: `docker build -t septalfauzan/pub-kit:<version> .`
Run: `docker run -p 8080:80 septalfauzan/pub-kit:<version>`
```

- [ ] **Step 4: Verify README formatting**

Run: `git diff -- README.md`

Expected: The appended section renders as clean Markdown (heading, bullet list, code blocks).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/docker-publish.yml README.md
git commit -m "ci: add docker publish workflow on version tags"
```

---

## Verification Checklist

- [ ] `docker build -t septalfauzan/pub-kit:test .` succeeds (Task 1 Step 4)
- [ ] Container serves SPA and deep-link routes return 200 (Task 1 Step 5)
- [ ] Workflow YAML validates (Task 2 Step 2)
- [ ] README documents `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets (Task 2 Step 4)
- [ ] Pushing tag `v1.2.3` produces `septalfauzan/pub-kit:1.2.3` on Docker Hub with no `latest` (manual acceptance)
