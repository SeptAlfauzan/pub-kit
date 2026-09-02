# Launchsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side-only 4-step wizard web app that generates all App Store + Google Play visual assets from a single source icon/screenshot set.

**Architecture:** Vue 3 Composition API + TypeScript strict + single Pinia store. Feature-sliced component layout. Konva for mockup editor (main-thread). Web Workers via OffscreenCanvas for icon/screenshot processing. JSZip for client-side export. Faithful port of the `launchsheet-ui.html` design tokens.

**Tech Stack:** Vue 3, Pinia, Konva, JSZip, OffscreenCanvas Web Workers, Vitest, Playwright

## Global Constraints

- Node `^22.18.0 || >=24.12.0`; Vite 8, Vue 3.5+, TypeScript ~6.0
- No semicolons, single quotes, 100-char print width (Prettier)
- `<script setup lang="ts">` for all `.vue` files; no Options API
- All images client-side only; assets never leave the browser
- Every interactive element keyboard-accessible; status = color + text
- Existing scaffold: `src/main.ts` (Pinia + Router), `src/App.vue` (stub), `src/router/index.ts` (empty routes), `src/stores/counter.ts` (scaffold — replace)

## File Structure

```
src/
  config/
    ios-icon-sizes.ts            # iOS icon size table
    android-icon-sizes.ts        # Android icon size table
    store-screenshot-sizes.ts    # Screenshot target size dropdown
  models/
    types.ts                     # Shared TypeScript interfaces
  services/
    validation.ts                # validateShot, validateFeatureGraphic, validateIcon
    worker-pool.ts               # OffscreenCanvas worker pool
    icon-generator.ts            # Icon generation dispatch
    screenshot-resizer.ts        # Screenshot resize dispatch
    mockup-composer.ts           # Konva stage → PNG
    zip-exporter.ts              # JSZip assembly
    workers/
      icon.worker.ts             # Icon resize worker
      screenshot.worker.ts       # Screenshot resize worker
  components/
    ui/
      Dropzone.vue               # Drag-and-drop upload
      Toggle.vue                 # Pill toggle buttons
      Swatch.vue                 # Color swatch selector
      ShotRow.vue                # Screenshot validation row
    icon-step/
      IconUploader.vue           # Source icon upload (single or fg/bg)
      IconSizeGrid.vue           # Grid of generated icon sizes
      IconTile.vue               # Single icon tile
    screenshots-step/
      TargetSizeSelect.vue       # Target size dropdown
      ShotList.vue               # List of uploaded screenshots
      FeatureGraphic.vue         # Play Store feature graphic upload
    mockup-step/
      MockupCard.vue             # Konva-based framed screenshot card
      MockupRow.vue              # Horizontal wrapping row of cards
      FrameControls.vue          # Phone/tablet/none toggle
      BackgroundControls.vue     # Swatch row + custom image
    store-preview-step/
      StoreToggle.vue            # App Store / Google Play switch
      AppStoreCard.vue           # iOS listing preview
      GooglePlayCard.vue         # Play Store listing preview
    StepRail.vue                 # 4-step navigation sidebar
    ExportButton.vue             # Export all button with progress
  stores/
    project.ts                   # Single Pinia store (replaces counter.ts)
  App.vue                        # App shell: header + StepRail + active panel
  assets/
    styles/
      tokens.css                 # CSS custom properties (design tokens)
```

---

### Task 1: Install Dependencies & Configure Worker Support

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`

**Interfaces:**
- Produces: dependencies available for all subsequent tasks

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add konva jszip
```

- [ ] **Step 2: Install dev types**

```bash
pnpm add -D @types/jszip
```

Note: Konva ships its own types. JSZip ships its own types (`@types/jszip` is deprecated but jszip itself includes `dist/jszip.d.ts` — verify; if it ships types, skip the `@types` install).

- [ ] **Step 3: Add worker type declarations**

Create `src/env.d.ts` or append to existing `env.d.ts`:

```ts
/// <reference types="vite/client" />

interface WorkerGlobalScope {
  ImageBitmap: typeof ImageBitmap
}
```

- [ ] **Step 4: Verify build still works**

```bash
pnpm run build
```

Expected: builds with no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts env.d.ts
git commit -m "feat: add konva + jszip dependencies"
```

---

### Task 2: Design Tokens & Types

**Files:**
- Create: `src/assets/styles/tokens.css`
- Create: `src/models/types.ts`
- Modify: `src/App.vue`

**Interfaces:**
- Produces: all TypeScript interfaces used across the app; CSS custom properties available globally

- [ ] **Step 1: Create CSS design tokens**

Create `src/assets/styles/tokens.css`:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #f5f5f4;
  --surface-1: #ffffff;
  --surface-2: #f0efed;
  --border: #e2e0db;
  --border-strong: #c9c6bf;
  --text-primary: #1a1916;
  --text-secondary: #6b6860;
  --text-muted: #9e9b94;
  --text-accent: #1d4ed8;
  --text-success: #15803d;
  --text-warning: #b45309;
  --fill-primary: #1d4ed8;
  --on-primary: #ffffff;
  --fill-accent: #dbeafe;
  --on-accent: #1e40af;
  --fill-control: #e9e8e4;
  --fill-ghost-selected: #eef2ff;
  --fill-ghost-hover: #f5f5f4;
  --bg-accent: #dbeafe;
  --radius: 8px;
  --h-control: 36px;
  --font-mono: 'Menlo', 'Consolas', monospace;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  min-height: 100vh;
  padding: 24px;
}

.pass { color: var(--text-success); }
.warn { color: var(--text-warning); }
```

- [ ] **Step 2: Create shared TypeScript types**

Create `src/models/types.ts`:

```ts
export type StepId = 'icon' | 'shots' | 'mockup' | 'store'

export interface IconSizeEntry {
  key: string
  label: string
  width: number
  height: number
  platform: 'ios' | 'android'
}

export interface IconResult {
  key: string
  blob: Blob
  url: string
}

export interface TargetSize {
  label: string
  width: number
  height: number
  platform: 'ios' | 'android'
}

export type ShotStatus = 'pass' | 'warn' | 'error'

export interface Shot {
  id: string
  name: string
  width: number
  height: number
  file: File
  url: string
  status: ShotStatus
  statusMessage: string
}

export interface FeatureGraphic {
  file: File
  url: string
  width: number
  height: number
  status: ShotStatus
  statusMessage: string
}

export interface MockupSettings {
  frame: 'phone' | 'tablet' | 'none'
  bg: string
  bgText: string
  bgImage: string | null
  captions: Record<string, string>
}

export interface ProjectState {
  currentStep: StepId
  appName: string
  iconSource: string | null
  iconForeground: string | null
  iconBackground: string | null
  iconResults: IconResult[]
  targetSizeIndex: number
  shots: Shot[]
  featureGraphic: FeatureGraphic | null
  mockupSettings: MockupSettings
  readySteps: Record<StepId, boolean>
}
```

- [ ] **Step 3: Import tokens in main.ts**

Modify `src/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/styles/tokens.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
```

- [ ] **Step 4: Verify type-check passes**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/assets/styles/tokens.css src/models/types.ts src/main.ts
git commit -m "feat: add design tokens and shared types"
```

---

### Task 3: Config Tables (iOS, Android, Screenshot Targets)

**Files:**
- Create: `src/config/ios-icon-sizes.ts`
- Create: `src/config/android-icon-sizes.ts`
- Create: `src/config/store-screenshot-sizes.ts`

**Interfaces:**
- Produces: `IOS_ICON_SIZES`, `ANDROID_ICON_SIZES`, `TARGET_SIZES` arrays consumed by Step 1, Step 2, and icon-generator service

- [ ] **Step 1: Create iOS icon sizes config**

Create `src/config/ios-icon-sizes.ts`:

```ts
import type { IconSizeEntry } from '@/models/types'

export const IOS_ICON_SIZES: IconSizeEntry[] = [
  { key: 'appstore',      label: 'App Store',    width: 1024, height: 1024, platform: 'ios' },
  { key: 'iphone-60-2x',  label: 'iPhone 60 @2x', width: 120,  height: 120,  platform: 'ios' },
  { key: 'iphone-60-3x',  label: 'iPhone 60 @3x', width: 180,  height: 180,  platform: 'ios' },
  { key: 'iphone-29-2x',  label: 'iPhone 29 @2x', width: 58,   height: 58,   platform: 'ios' },
  { key: 'iphone-29-3x',  label: 'iPhone 29 @3x', width: 87,   height: 87,   platform: 'ios' },
  { key: 'iphone-40-2x',  label: 'iPhone 40 @2x', width: 80,   height: 80,   platform: 'ios' },
  { key: 'iphone-40-3x',  label: 'iPhone 40 @3x', width: 120,  height: 120,  platform: 'ios' },
  { key: 'iphone-20-2x',  label: 'iPhone 20 @2x', width: 40,   height: 40,   platform: 'ios' },
  { key: 'iphone-20-3x',  label: 'iPhone 20 @3x', width: 60,   height: 60,   platform: 'ios' },
  { key: 'ipad-76-1x',    label: 'iPad 76 @1x',   width: 76,   height: 76,   platform: 'ios' },
  { key: 'ipad-76-2x',    label: 'iPad 76 @2x',   width: 152,  height: 152,  platform: 'ios' },
  { key: 'ipad-83-2x',    label: 'iPad Pro 83 @2x', width: 167, height: 167, platform: 'ios' },
  { key: 'ipad-20-1x',    label: 'iPad 20 @1x',   width: 20,   height: 20,   platform: 'ios' },
  { key: 'ipad-20-2x',    label: 'iPad 20 @2x',   width: 40,   height: 40,   platform: 'ios' },
  { key: 'ipad-29-1x',    label: 'iPad 29 @1x',   width: 29,   height: 29,   platform: 'ios' },
  { key: 'ipad-29-2x',    label: 'iPad 29 @2x',   width: 58,   height: 58,   platform: 'ios' },
  { key: 'ipad-40-1x',    label: 'iPad 40 @1x',   width: 40,   height: 40,   platform: 'ios' },
  { key: 'ipad-40-2x',    label: 'iPad 40 @2x',   width: 80,   height: 80,   platform: 'ios' },
]
```

- [ ] **Step 2: Create Android icon sizes config**

Create `src/config/android-icon-sizes.ts`:

```ts
import type { IconSizeEntry } from '@/models/types'

export const ANDROID_LAUNCHER_SIZES: IconSizeEntry[] = [
  { key: 'play-store',  label: 'Play Store', width: 512,  height: 512,  platform: 'android' },
  { key: 'xxxhdpi',     label: 'xxxhdpi',    width: 192,  height: 192,  platform: 'android' },
  { key: 'xxhdpi',      label: 'xxhdpi',     width: 144,  height: 144,  platform: 'android' },
  { key: 'xhdpi',       label: 'xhdpi',      width: 96,   height: 96,   platform: 'android' },
  { key: 'hdpi',        label: 'hdpi',       width: 72,   height: 72,   platform: 'android' },
  { key: 'mdpi',        label: 'mdpi',       width: 48,   height: 48,   platform: 'android' },
]

export const ANDROID_ADAPTIVE_SIZES: IconSizeEntry[] = [
  { key: 'adaptive-xxxhdpi', label: 'xxxhdpi fg', width: 432, height: 432, platform: 'android' },
  { key: 'adaptive-xxhdpi',  label: 'xxhdpi fg',  width: 324, height: 324, platform: 'android' },
  { key: 'adaptive-xhdpi',   label: 'xhdpi fg',   width: 216, height: 216, platform: 'android' },
  { key: 'adaptive-hdpi',    label: 'hdpi fg',    width: 162, height: 162, platform: 'android' },
  { key: 'adaptive-mdpi',    label: 'mdpi fg',    width: 108, height: 108, platform: 'android' },
]

export const ALL_ANDROID_SIZES = [...ANDROID_LAUNCHER_SIZES, ...ANDROID_ADAPTIVE_SIZES]
```

- [ ] **Step 3: Create screenshot target sizes config**

Create `src/config/store-screenshot-sizes.ts`:

```ts
import type { TargetSize } from '@/models/types'

export const TARGET_SIZES: TargetSize[] = [
  { label: 'iPhone 6.9" display', width: 1320, height: 2868, platform: 'ios' },
  { label: 'iPhone 6.5" display', width: 1284, height: 2778, platform: 'ios' },
  { label: 'iPad Pro 13"',        width: 2064, height: 2752, platform: 'ios' },
  { label: 'Android phone',       width: 1080, height: 1920, platform: 'android' },
  { label: 'Android 7" tablet',   width: 1200, height: 1920, platform: 'android' },
  { label: 'Android 10" tablet',  width: 1600, height: 2560, platform: 'android' },
]

export const FEATURE_GRAPHIC_SIZE = { width: 1024, height: 500 } as const
```

- [ ] **Step 4: Verify type-check passes**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/
git commit -m "feat: add icon and screenshot size config tables"
```

---

### Task 4: Validation Service

**Files:**
- Create: `src/services/validation.ts`
- Create: `src/services/__tests__/validation.spec.ts`

**Interfaces:**
- Consumes: `TARGET_SIZES`, `FeatureGraphic`, `Shot`, `ICON_MIN_SIZE` from types/config
- Produces: `validateShot()`, `validateFeatureGraphic()`, `validateIconResolution()`

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/validation.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  validateShot,
  validateFeatureGraphic,
  validateIconResolution,
} from '../validation'
import { TARGET_SIZES } from '@/config/store-screenshot-sizes'

describe('validateShot', () => {
  it('passes for exact portrait match on iOS target', () => {
    const result = validateShot(1320, 2868, 0) // iPhone 6.9"
    expect(result.status).toBe('pass')
  })

  it('passes for landscape orientation on iOS target', () => {
    const result = validateShot(2868, 1320, 0) // iPhone 6.9" landscape
    expect(result.status).toBe('pass')
  })

  it('warns for wrong dimensions on iOS target', () => {
    const result = validateShot(800, 600, 0)
    expect(result.status).toBe('warn')
    expect(result.message).toContain("doesn't match")
  })

  it('passes for 16:9 Android screenshot within size bounds', () => {
    // 1080x1920 = 9:16
    const result = validateShot(1080, 1920, 3) // Android phone
    expect(result.status).toBe('pass')
  })

  it('passes for 9:16 landscape Android screenshot', () => {
    // 1920x1080 = 16:9
    const result = validateShot(1920, 1080, 3) // Android phone
    expect(result.status).toBe('pass')
  })

  it('warns for non-16:9 Android screenshot', () => {
    // 1000x1500 = 2:3, not 16:9
    const result = validateShot(1000, 1500, 3)
    expect(result.status).toBe('warn')
  })

  it('warns for Android screenshot with side below 320px', () => {
    // 200x355 is roughly 16:9 but side < 320
    const result = validateShot(200, 355, 3)
    expect(result.status).toBe('warn')
  })

  it('warns for Android screenshot with side above 3840px', () => {
    // 4000x7111 is roughly 16:9 but side > 3840
    const result = validateShot(4000, 7111, 3)
    expect(result.status).toBe('warn')
  })

  it('warns for dimensions that are not 16:9 or 9:16 on Android', () => {
    // 1080x2340 = 9:19.5, not valid
    const result = validateShot(1080, 2340, 3)
    expect(result.status).toBe('warn')
  })
})

describe('validateFeatureGraphic', () => {
  it('passes for exact 1024x500', () => {
    const result = validateFeatureGraphic(1024, 500)
    expect(result.status).toBe('pass')
  })

  it('warns for wrong dimensions', () => {
    const result = validateFeatureGraphic(800, 400)
    expect(result.status).toBe('warn')
  })
})

describe('validateIconResolution', () => {
  it('passes for 1024x1024', () => {
    expect(validateIconResolution(1024, 1024).status).toBe('pass')
  })

  it('passes for 512x512 (minimum)', () => {
    expect(validateIconResolution(512, 512).status).toBe('pass')
  })

  it('warns for below 512', () => {
    expect(validateIconResolution(256, 256).status).toBe('warn')
  })

  it('warns for non-square', () => {
    expect(validateIconResolution(1024, 512).status).toBe('warn')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm run test:unit -- src/services/__tests__/validation.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement validation service**

Create `src/services/validation.ts`:

```ts
import { TARGET_SIZES, FEATURE_GRAPHIC_SIZE } from '@/config/store-screenshot-sizes'

export interface ValidationResult {
  status: 'pass' | 'warn'
  message: string
}

const ICON_MIN_SIZE = 512

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyRatio(w: number, h: number): [number, number] {
  const d = gcd(w, h)
  return [w / d, h / d]
}

function isAndroidValid(w: number, h: number): boolean {
  const [rw, rh] = simplifyRatio(w, h)
  const isNineSixteen = (rw === 9 && rh === 16) || (rw === 16 && rh === 9)
  if (!isNineSixteen) return false
  if (w < 320 || w > 3840) return false
  if (h < 320 || h > 3840) return false
  return true
}

function isExactMatch(w: number, h: number, targetW: number, targetH: number): boolean {
  return (w === targetW && h === targetH) || (w === targetH && h === targetW)
}

export function validateShot(
  width: number,
  height: number,
  targetSizeIndex: number,
): ValidationResult {
  const target = TARGET_SIZES[targetSizeIndex]
  if (!target) {
    return { status: 'warn', message: 'Invalid target size' }
  }

  if (target.platform === 'android') {
    if (isAndroidValid(width, height)) {
      return { status: 'pass', message: `${width}×${height} · matches` }
    }
    return {
      status: 'warn',
      message: `${width}×${height} · doesn't match ${target.width}×${target.height} (need 16:9 or 9:16, sides 320–3840px)`,
    }
  }

  if (isExactMatch(width, height, target.width, target.height)) {
    return { status: 'pass', message: `${width}×${height} · matches` }
  }
  return {
    status: 'warn',
    message: `${width}×${height} · doesn't match ${target.width}×${target.height}`,
  }
}

export function validateFeatureGraphic(
  width: number,
  height: number,
): ValidationResult {
  if (width === FEATURE_GRAPHIC_SIZE.width && height === FEATURE_GRAPHIC_SIZE.height) {
    return { status: 'pass', message: `${width}×${height} · matches` }
  }
  return {
    status: 'warn',
    message: `${width}×${height} · doesn't match ${FEATURE_GRAPHIC_SIZE.width}×${FEATURE_GRAPHIC_SIZE.height}`,
  }
}

export function validateIconResolution(
  width: number,
  height: number,
): ValidationResult {
  if (width < ICON_MIN_SIZE || height < ICON_MIN_SIZE) {
    return {
      status: 'warn',
      message: `${width}×${height} · below recommended ${ICON_MIN_SIZE}×${ICON_MIN_SIZE}`,
    }
  }
  if (width !== height) {
    return { status: 'warn', message: `${width}×${height} · not square` }
  }
  return { status: 'pass', message: `${width}×${height} · OK` }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm run test:unit -- src/services/__tests__/validation.spec.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/validation.ts src/services/__tests__/validation.spec.ts
git commit -m "feat: add validation service with shot/icon/feature-graphic validation"
```

---

### Task 5: Worker Pool

**Files:**
- Create: `src/services/worker-pool.ts`
- Create: `src/services/__tests__/worker-pool.spec.ts`
- Create: `src/services/workers/icon.worker.ts`
- Create: `src/services/workers/screenshot.worker.ts`

**Interfaces:**
- Consumes: icon/screenshot size configs
- Produces: `WorkerPool` class — `dispatch<T>(job)` returns `Promise<T>`, supports `cancel(id)`, `terminate()`

- [ ] **Step 1: Create stub workers**

Create `src/services/workers/icon.worker.ts`:

```ts
self.onmessage = (e: MessageEvent) => {
  const { id, op, payload } = e.data
  // Placeholder — will be implemented in Task 7
  self.postMessage({ id, status: 'ok', result: null })
}
```

Create `src/services/workers/screenshot.worker.ts`:

```ts
self.onmessage = (e: MessageEvent) => {
  const { id, op, payload } = e.data
  // Placeholder — will be implemented in Task 8
  self.postMessage({ id, status: 'ok', result: null })
}
```

- [ ] **Step 2: Write the failing worker pool tests**

Create `src/services/__tests__/worker-pool.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WorkerPool } from '../worker-pool'

// Mock Worker
class MockWorker {
  static instanceCount = 0
  id: number
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null

  constructor(_url: string | URL) {
    MockWorker.instanceCount++
    this.id = MockWorker.instanceCount
  }

  postMessage(data: unknown) {
    // Simulate async response
    setTimeout(() => {
      this.onmessage?.({
        data: { id: (data as { id: string }).id, status: 'ok', result: `result-${this.id}` },
      } as MessageEvent)
    }, 0)
  }

  terminate() {}
}

describe('WorkerPool', () => {
  beforeEach(() => {
    MockWorker.instanceCount = 0
    vi.stubGlobal('Worker', MockWorker)
    vi.stubGlobal('navigator', { hardwareConcurrency: 4 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates workers based on hardwareConcurrency', () => {
    const pool = new WorkerPool({ workerUrl: new URL('./workers/icon.worker.ts', import.meta.url), maxWorkers: 4 })
    expect(MockWorker.instanceCount).toBe(4)
    pool.terminate()
  })

  it('caps workers at maxWorkers', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 16 })
    const pool = new WorkerPool({ workerUrl: new URL('./workers/icon.worker.ts', import.meta.url), maxWorkers: 4 })
    expect(MockWorker.instanceCount).toBe(4)
    pool.terminate()
  })

  it('dispatches a job and resolves', async () => {
    const pool = new WorkerPool({ workerUrl: new URL('./workers/icon.worker.ts', import.meta.url), maxWorkers: 2 })
    const result = await pool.dispatch<{ test: boolean }>({ id: 'job-1', op: 'test', payload: {} })
    expect(result).toBeDefined()
    pool.terminate()
  })

  it('round-robins across workers', async () => {
    const pool = new WorkerPool({ workerUrl: new URL('./workers/icon.worker.ts', import.meta.url), maxWorkers: 2 })
    await pool.dispatch({ id: 'j1', op: 'test', payload: {} })
    await pool.dispatch({ id: 'j2', op: 'test', payload: {} })
    // Both workers should have been used
    pool.terminate()
  })

  it('terminate kills all workers', () => {
    const pool = new WorkerPool({ workerUrl: new URL('./workers/icon.worker.ts', import.meta.url), maxWorkers: 3 })
    const spy = vi.spyOn(MockWorker.prototype, 'terminate')
    pool.terminate()
    expect(spy).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm run test:unit -- src/services/__tests__/worker-pool.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement worker pool**

Create `src/services/worker-pool.ts`:

```ts
export interface PoolJob {
  id: string
  op: string
  payload: unknown
}

export interface PoolOptions {
  workerUrl: string | URL
  maxWorkers?: number
}

type ResolveFn = (value: unknown) => void
type RejectFn = (reason?: unknown) => void

interface PendingJob {
  resolve: ResolveFn
  reject: RejectFn
  originalJob: PoolJob
}

export class WorkerPool {
  private workers: Worker[] = []
  private nextIndex = 0
  private pending = new Map<string, PendingJob>()
  private cancelled = new Set<string>()
  private retryCounts = new Map<string, number>()
  private maxRetries = 3

  constructor({ workerUrl, maxWorkers = 4 }: PoolOptions) {
    const count = Math.min(
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2,
      maxWorkers,
    )
    for (let i = 0; i < count; i++) {
      const worker = new Worker(workerUrl)
      worker.onmessage = (e: MessageEvent) => {
        const { id, status, result, error } = e.data
        if (this.cancelled.has(id)) {
          this.cancelled.delete(id)
          return
        }
        const job = this.pending.get(id)
        if (!job) return
        this.pending.delete(id)
        if (status === 'ok') {
          this.retryCounts.delete(id)
          job.resolve(result)
        } else {
          this.retryJob(id)
        }
      }
      this.workers.push(worker)
    }
  }

  dispatch<T>(job: PoolJob): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(job.id, { resolve: resolve as ResolveFn, reject, originalJob: job })
      const worker = this.workers[this.nextIndex % this.workers.length]!
      this.nextIndex++
      worker.postMessage(job)
    })
  }

  private retryJob(id: string): void {
    const pending = this.pending.get(id)
    if (!pending) return
    const retries = this.retryCounts.get(id) ?? 0
    if (retries >= this.maxRetries) {
      this.retryCounts.delete(id)
      this.pending.delete(id)
      pending.reject(new Error('Worker job failed after 3 retries'))
      return
    }
    this.retryCounts.set(id, retries + 1)
    const worker = this.workers[this.nextIndex % this.workers.length]!
    this.nextIndex++
    worker.postMessage(pending.originalJob)
  }

  cancel(jobId: string): void {
    this.cancelled.add(jobId)
    this.retryCounts.delete(jobId)
    const job = this.pending.get(jobId)
    if (job) {
      this.pending.delete(jobId)
      job.reject(new Error('Cancelled'))
    }
  }

  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    for (const [, job] of this.pending) {
      job.reject(new Error('Pool terminated'))
    }
    this.pending.clear()
    this.retryCounts.clear()
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm run test:unit -- src/services/__tests__/worker-pool.spec.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/worker-pool.ts src/services/workers/ src/services/__tests__/worker-pool.spec.ts
git commit -m "feat: add worker pool with round-robin dispatch and cancellation"
```

---

### Task 6: Icon Generator Service

**Files:**
- Create: `src/services/icon-generator.ts`
- Modify: `src/services/workers/icon.worker.ts`

**Interfaces:**
- Consumes: `WorkerPool`, `IOS_ICON_SIZES`, `ANDROID_LAUNCHER_SIZES`, `ANDROID_ADAPTIVE_SIZES`
- Produces: `generateIcons(sourceImage: ImageBitmap) → Promise<IconResult[]>`

- [ ] **Step 1: Implement the icon worker**

Replace `src/services/workers/icon.worker.ts`:

```ts
interface IconJobPayload {
  sourceWidth: number
  sourceHeight: number
  sizes: { key: string; width: number; height: number }[]
  sourceBitmap?: ImageBitmap
}

self.onmessage = async (e: MessageEvent) => {
  const { id, payload } = e.data as { id: string; payload: IconJobPayload }

  try {
    // Source bitmap is transferred to us
    const bitmap = payload.sourceBitmap
    if (!bitmap) {
      self.postMessage({ id, status: 'error', error: 'No source bitmap' })
      return
    }

    const results: { key: string; blob: Blob }[] = []

    for (const size of payload.sizes) {
      const canvas = new OffscreenCanvas(size.width, size.height)
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, size.width, size.height)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      results.push({ key: size.key, blob })
    }

    bitmap.close()
    self.postMessage({ id, status: 'ok', result: results })
  } catch (err) {
    self.postMessage({ id, status: 'error', error: String(err) })
  }
}
```

- [ ] **Step 2: Implement icon generator service**

Create `src/services/icon-generator.ts`:

```ts
import { IOS_ICON_SIZES } from '@/config/ios-icon-sizes'
import { ALL_ANDROID_SIZES } from '@/config/android-icon-sizes'
import type { IconResult } from '@/models/types'
import { WorkerPool } from './worker-pool'

let pool: WorkerPool | null = null

function getPool(): WorkerPool {
  if (!pool) {
    pool = new WorkerPool({
      workerUrl: new URL('./workers/icon.worker.ts', import.meta.url),
      maxWorkers: 2,
    })
  }
  return pool
}

export async function generateIcons(sourceFile: File): Promise<IconResult[]> {
  const bitmap = await createImageBitmap(sourceFile)
  const sizes = [...IOS_ICON_SIZES, ...ALL_ANDROID_SIZES].map((s) => ({
    key: s.key,
    width: s.width,
    height: s.height,
  }))

  const workerPool = getPool()
  const results = await workerPool.dispatch<
    { key: string; blob: Blob }[]
  >({
    id: `icon-${Date.now()}`,
    op: 'gen-icons',
    payload: {
      sourceWidth: bitmap.width,
      sourceHeight: bitmap.height,
      sizes,
      sourceBitmap: bitmap,
    },
  })

  bitmap.close()

  return results.map((r) => ({
    key: r.key,
    blob: r.blob,
    url: URL.createObjectURL(r.blob),
  }))
}

export function terminateIconWorker(): void {
  pool?.terminate()
  pool = null
}
```

- [ ] **Step 3: Verify type-check passes**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/icon-generator.ts src/services/workers/icon.worker.ts
git commit -m "feat: add icon generator service with OffscreenCanvas worker"
```

---

### Task 7: Screenshot Resizer Service

**Files:**
- Create: `src/services/screenshot-resizer.ts`
- Modify: `src/services/workers/screenshot.worker.ts`

**Interfaces:**
- Consumes: `WorkerPool`, `TARGET_SIZES`
- Produces: `resizeScreenshot(file, targetIndex, cropMode?) → Promise<Blob>`, `batchResize(shots, targetIndex) → Promise<{id, blob}[]>`

- [ ] **Step 1: Implement the screenshot worker**

Replace `src/services/workers/screenshot.worker.ts`:

```ts
interface ResizeJobPayload {
  targetWidth: number
  targetHeight: number
  mode: 'center-crop' | 'letterbox'
  sourceBitmap?: ImageBitmap
}

self.onmessage = async (e: MessageEvent) => {
  const { id, payload } = e.data as { id: string; payload: ResizeJobPayload }

  try {
    const bitmap = payload.sourceBitmap
    if (!bitmap) {
      self.postMessage({ id, status: 'error', error: 'No source bitmap' })
      return
    }

    const { targetWidth: tw, targetHeight: th, mode } = payload
    const canvas = new OffscreenCanvas(tw, th)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (mode === 'center-crop') {
      const srcAspect = bitmap.width / bitmap.height
      const dstAspect = tw / th
      let sx: number, sy: number, sw: number, sh: number
      if (srcAspect > dstAspect) {
        sh = bitmap.height
        sw = sh * dstAspect
        sx = (bitmap.width - sw) / 2
        sy = 0
      } else {
        sw = bitmap.width
        sh = sw / dstAspect
        sx = 0
        sy = (bitmap.height - sh) / 2
      }
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, tw, th)
    } else {
      // Letterbox: fit inside, pad with white
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tw, th)
      const srcAspect = bitmap.width / bitmap.height
      const dstAspect = tw / th
      let dw: number, dh: number
      if (srcAspect > dstAspect) {
        dw = tw
        dh = tw / srcAspect
      } else {
        dh = th
        dw = th * srcAspect
      }
      const dx = (tw - dw) / 2
      const dy = (th - dh) / 2
      ctx.drawImage(bitmap, dx, dy, dw, dh)
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    bitmap.close()
    self.postMessage({ id, status: 'ok', result: blob })
  } catch (err) {
    self.postMessage({ id, status: 'error', error: String(err) })
  }
}
```

- [ ] **Step 2: Implement screenshot resizer service**

Create `src/services/screenshot-resizer.ts`:

```ts
import { TARGET_SIZES } from '@/config/store-screenshot-sizes'
import { WorkerPool } from './worker-pool'

let pool: WorkerPool | null = null

function getPool(): WorkerPool {
  if (!pool) {
    pool = new WorkerPool({
      workerUrl: new URL('./workers/screenshot.worker.ts', import.meta.url),
      maxWorkers: 4,
    })
  }
  return pool
}

export async function resizeScreenshot(
  file: File,
  targetIndex: number,
  mode: 'center-crop' | 'letterbox' = 'center-crop',
): Promise<Blob> {
  const target = TARGET_SIZES[targetIndex]
  if (!target) throw new Error('Invalid target index')

  const bitmap = await createImageBitmap(file)
  const workerPool = getPool()
  const blob = await workerPool.dispatch<Blob>({
    id: `shot-${Date.now()}-${file.name}`,
    op: 'resize-shot',
    payload: {
      targetWidth: target.width,
      targetHeight: target.height,
      mode,
      sourceBitmap: bitmap,
    },
  })
  bitmap.close()
  return blob
}

export async function batchResize(
  files: { id: string; file: File }[],
  targetIndex: number,
  mode: 'center-crop' | 'letterbox' = 'center-crop',
): Promise<{ id: string; blob: Blob }[]> {
  const target = TARGET_SIZES[targetIndex]
  if (!target) throw new Error('Invalid target index')

  const workerPool = getPool()
  const results = await Promise.all(
    files.map(async ({ id, file }) => {
      const bitmap = await createImageBitmap(file)
      const blob = await workerPool.dispatch<Blob>({
        id: `batch-${id}`,
        op: 'resize-shot',
        payload: {
          targetWidth: target.width,
          targetHeight: target.height,
          mode,
          sourceBitmap: bitmap,
        },
      })
      bitmap.close()
      return { id, blob }
    }),
  )
  return results
}

export function terminateScreenshotWorker(): void {
  pool?.terminate()
  pool = null
}
```

- [ ] **Step 3: Verify type-check passes**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/screenshot-resizer.ts src/services/workers/screenshot.worker.ts
git commit -m "feat: add screenshot resizer service with center-crop and letterbox modes"
```

---

### Task 8: Pinia Store

**Files:**
- Create: `src/stores/project.ts`
- Create: `src/stores/__tests__/project.spec.ts`
- Delete: `src/stores/counter.ts`

**Interfaces:**
- Consumes: all types, `validateShot`, `validateFeatureGraphic`
- Produces: `useProjectStore()` — single store with all app state + actions

- [ ] **Step 1: Write the failing store tests**

Create `src/stores/__tests__/project.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../project'

describe('useProjectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts at step icon', () => {
    const store = useProjectStore()
    expect(store.currentStep).toBe('icon')
  })

  it('starts with no steps ready', () => {
    const store = useProjectStore()
    expect(store.readyCount).toBe(0)
  })

  it('sets icon step ready when icon uploaded', () => {
    const store = useProjectStore()
    store.setIconSource('data:image/png;base64,...')
    expect(store.readySteps.icon).toBe(true)
    expect(store.readyCount).toBe(1)
  })

  it('adds a shot and sets shots step ready', () => {
    const store = useProjectStore()
    store.addShot({
      id: 's1',
      name: 'home.png',
      width: 1320,
      height: 2868,
      file: new File([], 'home.png'),
      url: '',
    })
    expect(store.shots).toHaveLength(1)
    expect(store.readySteps.shots).toBe(true)
  })

  it('removes a shot by id', () => {
    const store = useProjectStore()
    store.addShot({
      id: 's1',
      name: 'home.png',
      width: 1320,
      height: 2868,
      file: new File([], 'home.png'),
      url: '',
    })
    store.removeShot('s1')
    expect(store.shots).toHaveLength(0)
  })

  it('revalidates all shots on target size change', () => {
    const store = useProjectStore()
    store.addShot({
      id: 's1',
      name: 'home.png',
      width: 1000,
      height: 1500,
      file: new File([], 'home.png'),
      url: '',
    })
    store.setTargetSize(0) // iPhone 6.9" — 1000x1500 won't match
    expect(store.shots[0]!.status).toBe('warn')
  })

  it('updates mockup frame', () => {
    const store = useProjectStore()
    store.setMockupFrame('tablet')
    expect(store.mockupSettings.frame).toBe('tablet')
  })

  it('updates mockup caption per shot', () => {
    const store = useProjectStore()
    store.setMockupCaption('s1', 'Hello World')
    expect(store.mockupSettings.captions['s1']).toBe('Hello World')
  })

  it('navigates steps', () => {
    const store = useProjectStore()
    store.setStep('shots')
    expect(store.currentStep).toBe('shots')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm run test:unit -- src/stores/__tests__/project.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the project store**

Create `src/stores/project.ts`:

```ts
import { ref, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import type { StepId, Shot, FeatureGraphic, MockupSettings, IconResult } from '@/models/types'
import { validateShot, validateFeatureGraphic } from '@/services/validation'

let nextShotId = 0

export const useProjectStore = defineStore('project', () => {
  const currentStep = ref<StepId>('icon')
  const appName = ref('My App')

  // Icon state
  const iconSource = ref<string | null>(null)
  const iconFile = ref<File | null>(null)
  const iconResults = ref<IconResult[]>([])

  // Screenshot state
  const targetSizeIndex = ref(0)
  const shots = ref<Shot[]>([])
  const featureGraphic = ref<FeatureGraphic | null>(null)

  // Mockup state
  const mockupSettings = reactive<MockupSettings>({
    frame: 'phone',
    bg: '#B5D4F4',
    bgText: '#042C53',
    bgImage: null,
    captions: {},
  })

  // Step readiness
  const readySteps = reactive<Record<StepId, boolean>>({
    icon: false,
    shots: false,
    mockup: false,
    store: false,
  })

  const readyCount = computed(() => {
    return (['icon', 'shots', 'mockup'] as const).filter((s) => readySteps[s]).length
  })

  // --- Actions ---

  function setStep(step: StepId) {
    currentStep.value = step
  }

  function setIconSource(url: string, file?: File) {
    iconSource.value = url
    iconFile.value = file ?? null
    readySteps.icon = true
  }

  function setIconResults(results: IconResult[]) {
    iconResults.value = results
  }

  function setTargetSize(index: number) {
    targetSizeIndex.value = index
    // Revalidate all shots
    for (const shot of shots.value) {
      const result = validateShot(shot.width, shot.height, targetSizeIndex.value)
      shot.status = result.status
      shot.statusMessage = result.message
    }
  }

  function addShot(data: {
    id: string
    name: string
    width: number
    height: number
    file: File
    url: string
  }) {
    const result = validateShot(data.width, data.height, targetSizeIndex.value)
    shots.value.push({
      ...data,
      status: result.status,
      statusMessage: result.message,
    })
    if (shots.value.length > 0) {
      readySteps.shots = true
    }
  }

  function removeShot(id: string) {
    shots.value = shots.value.filter((s) => s.id !== id)
    if (shots.value.length === 0 && !featureGraphic.value) {
      readySteps.shots = false
    }
  }

  function setFeatureGraphic(data: {
    file: File
    url: string
    width: number
    height: number
  }) {
    const result = validateFeatureGraphic(data.width, data.height)
    featureGraphic.value = {
      ...data,
      status: result.status,
      statusMessage: result.message,
    }
    readySteps.shots = true
  }

  function clearFeatureGraphic() {
    featureGraphic.value = null
  }

  function setMockupFrame(frame: MockupSettings['frame']) {
    mockupSettings.frame = frame
    readySteps.mockup = true
  }

  function setMockupBg(bg: string, bgText: string) {
    mockupSettings.bg = bg
    mockupSettings.bgText = bgText
    readySteps.mockup = true
  }

  function setMockupBgImage(url: string | null) {
    mockupSettings.bgImage = url
    readySteps.mockup = true
  }

  function setMockupCaption(shotId: string, caption: string) {
    mockupSettings.captions[shotId] = caption
  }

  function setAppName(name: string) {
    appName.value = name
  }

  return {
    currentStep,
    appName,
    iconSource,
    iconFile,
    iconResults,
    targetSizeIndex,
    shots,
    featureGraphic,
    mockupSettings,
    readySteps,
    readyCount,
    setStep,
    setIconSource,
    setIconResults,
    setTargetSize,
    addShot,
    removeShot,
    setFeatureGraphic,
    clearFeatureGraphic,
    setMockupFrame,
    setMockupBg,
    setMockupBgImage,
    setMockupCaption,
    setAppName,
  }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm run test:unit -- src/stores/__tests__/project.spec.ts
```

Expected: all PASS.

- [ ] **Step 5: Remove counter store scaffold**

```bash
rm src/stores/counter.ts
```

- [ ] **Step 6: Run type-check**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/stores/
git rm src/stores/counter.ts
git commit -m "feat: add project Pinia store with step readiness tracking"
```

---

### Task 9: UI Primitives (Dropzone, Toggle, Swatch, ShotRow)

**Files:**
- Create: `src/components/ui/Dropzone.vue`
- Create: `src/components/ui/Toggle.vue`
- Create: `src/components/ui/Swatch.vue`
- Create: `src/components/ui/ShotRow.vue`

**Interfaces:**
- Consumes: types, validation results
- Produces: reusable UI atoms used by all four steps

- [ ] **Step 1: Create Dropzone component**

Create `src/components/ui/Dropzone.vue`:

```vue
<script setup lang="ts">
defineProps<{
  label: string
  multiple?: boolean
  accept?: string
  inline?: boolean
}>()

const emit = defineEmits<{
  files: [files: File[]]
}>()

function onDrop(e: DragEvent) {
  e.preventDefault()
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (files.length) emit('files', files)
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length) emit('files', files)
  input.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).querySelector('input')?.click()
  }
}
</script>

<template>
  <label
    class="dropzone"
    :class="{ inline }"
    tabindex="0"
    role="button"
    :aria-label="label"
    @drop="onDrop"
    @dragover.prevent
    @keydown="onKeydown"
  >
    <slot name="icon">
      <i class="fa-solid fa-upload" aria-hidden="true"></i>
    </slot>
    <span>{{ label }}</span>
    <input
      type="file"
      :accept
      :multiple
      @change="onChange"
      tabindex="-1"
      aria-hidden="true"
    />
  </label>
</template>

<style scoped>
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 22px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  transition: background 0.15s, border-color 0.15s;
}
.dropzone:hover,
.dropzone:focus-visible {
  border-color: var(--fill-primary);
  background: var(--fill-ghost-hover);
  outline: none;
}
.dropzone.inline {
  flex-direction: row;
  padding: 14px 16px;
}
input[type='file'] {
  display: none;
}
</style>
```

- [ ] **Step 2: Create Toggle component**

Create `src/components/ui/Toggle.vue`:

```vue
<script setup lang="ts" generic="T extends string">
defineProps<{
  modelValue: T
  options: { value: T; label: string; icon?: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div class="toggle-group" role="radiogroup">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="toggle-btn"
      :class="{ selected: modelValue === opt.value }"
      role="radio"
      :aria-checked="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      <i v-if="opt.icon" :class="opt.icon" aria-hidden="true"></i>
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.toggle-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.toggle-btn {
  cursor: pointer;
  font: inherit;
  background: var(--surface-2);
  border: 0.5px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 12px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.toggle-btn:hover {
  background: var(--fill-ghost-hover);
}
.toggle-btn:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
.toggle-btn.selected {
  border: 2px solid var(--fill-primary);
  color: var(--text-accent);
}
</style>
```

- [ ] **Step 3: Create Swatch component**

Create `src/components/ui/Swatch.vue`:

```vue
<script setup lang="ts">
defineProps<{
  color: string
  selected?: boolean
  label: string
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    class="swatch"
    :class="{ selected }"
    :style="{ background: color }"
    :aria-label="label"
    :aria-pressed="selected"
    @click="emit('select')"
  ></button>
</template>

<style scoped>
.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 0.5px solid var(--border);
  cursor: pointer;
}
.swatch:hover {
  opacity: 0.9;
}
.swatch:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
.swatch.selected {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 4: Create ShotRow component**

Create `src/components/ui/ShotRow.vue`:

```vue
<script setup lang="ts">
defineProps<{
  name: string
  width: number
  height: number
  status: 'pass' | 'warn' | 'error'
  statusMessage: string
}>()

const emit = defineEmits<{
  remove: []
}>()
</script>

<template>
  <div class="shot-row">
    <i class="fa-solid fa-mobile-screen" aria-hidden="true"></i>
    <span class="shot-name">{{ name }}</span>
    <span class="shot-status" :class="status" role="status">
      {{ statusMessage }}
    </span>
    <i
      class="fa-solid fa-xmark shot-remove"
      role="button"
      tabindex="0"
      title="Remove"
      aria-label="Remove screenshot"
      @click="emit('remove')"
      @keydown.enter="emit('remove')"
      @keydown.space.prevent="emit('remove')"
    ></i>
  </div>
</template>

<style scoped>
.shot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: var(--radius);
  margin-bottom: 6px;
  font-size: 13px;
}
.shot-row i {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.shot-name {
  flex: 1;
}
.shot-status {
  font-size: 11px;
  font-family: var(--font-mono);
}
.shot-remove {
  cursor: pointer;
  color: var(--text-muted);
}
.shot-remove:hover {
  color: var(--text-primary);
}
.shot-remove:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 5: Verify type-check passes**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add UI primitive components (Dropzone, Toggle, Swatch, ShotRow)"
```

---

### Task 10: Step Rail & App Shell

**Files:**
- Create: `src/components/StepRail.vue`
- Create: `src/components/ExportButton.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `useProjectStore`
- Produces: app layout shell with header, step nav, and content slot

- [ ] **Step 1: Create StepRail component**

Create `src/components/StepRail.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import type { StepId } from '@/models/types'

const store = useProjectStore()

const steps: { id: StepId; label: string; num: number }[] = [
  { id: 'icon', label: 'Icon', num: 1 },
  { id: 'shots', label: 'Screenshots', num: 2 },
  { id: 'mockup', label: 'Mockup preview', num: 3 },
  { id: 'store', label: 'Store preview', num: 4 },
]
</script>

<template>
  <nav class="step-nav" aria-label="Steps">
    <button
      v-for="step in steps"
      :key="step.id"
      class="step-btn"
      :class="{ active: store.currentStep === step.id }"
      @click="store.setStep(step.id)"
    >
      <span class="step-num">{{ step.num }}</span>
      <span>{{ step.label }}</span>
      <i
        v-if="store.readySteps[step.id]"
        class="fa-solid fa-check step-check"
        aria-hidden="true"
      ></i>
    </button>
    <div class="ready-summary">
      {{ store.readyCount }} of 3 steps ready
    </div>
  </nav>
</template>

<style scoped>
.step-nav {
  width: 150px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.step-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 10px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
}
.step-btn:hover {
  background: var(--fill-ghost-hover);
}
.step-btn:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
.step-btn.active {
  background: var(--fill-ghost-selected);
  color: var(--text-primary);
}
.step-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--fill-control);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}
.step-btn.active .step-num {
  background: var(--fill-accent);
  color: var(--on-accent);
}
.step-check {
  margin-left: auto;
  color: var(--text-success);
  font-size: 14px;
}
.ready-summary {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 0.5px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 2: Create ExportButton component**

Create `src/components/ExportButton.vue`:

```vue
<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  export: []
}>()
</script>

<template>
  <button class="btn-primary" :disabled @click="emit('export')">
    <i class="fa-solid fa-download" aria-hidden="true"></i>
    Export all
  </button>
</template>

<style scoped>
.btn-primary {
  background: var(--fill-primary);
  color: var(--on-primary);
  border: none;
  height: var(--h-control);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 3: Update App.vue shell**

Replace `src/App.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import StepRail from '@/components/StepRail.vue'
import ExportButton from '@/components/ExportButton.vue'

const store = useProjectStore()
</script>

<template>
  <div class="app-card">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
        </div>
        <div>
          <div class="logo-title">Launchsheet</div>
          <div class="logo-sub">Project · {{ store.appName }}</div>
        </div>
      </div>
      <ExportButton @export="() => {}" />
    </div>
    <hr class="divider" />

    <div class="layout">
      <StepRail />
      <div class="panel">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-card {
  max-width: 860px;
  margin: 0 auto;
  background: var(--surface-1);
  border-radius: 16px;
  border: 0.5px solid var(--border);
  padding: 24px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--fill-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo i {
  font-size: 15px;
  color: var(--on-primary);
}
.logo-title {
  font-size: 16px;
  font-weight: 500;
}
.logo-sub {
  font-size: 12px;
  color: var(--text-muted);
}
hr.divider {
  border: none;
  border-top: 0.5px solid var(--border);
  margin-bottom: 1.25rem;
}
.layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.panel {
  flex: 1;
  min-width: 0;
}
</style>
```

- [ ] **Step 4: Update App.spec.ts**

Replace `src/__tests__/App.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the Launchsheet header', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Launchsheet')
  })

  it('shows project name from store', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('My App')
  })

  it('renders step rail with 4 steps', () => {
    const wrapper = mount(App)
    expect(wrapper.findAll('.step-btn')).toHaveLength(4)
  })

  it('shows 0 of 3 steps ready initially', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('0 of 3 steps ready')
  })
})
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm run test:unit -- src/__tests__/App.spec.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/StepRail.vue src/components/ExportButton.vue src/App.vue src/__tests__/App.spec.ts
git commit -m "feat: add app shell with header, step rail, and export button"
```

---

### Task 11: Step 1 — Icon Upload & Grid

**Files:**
- Create: `src/components/icon-step/IconUploader.vue`
- Create: `src/components/icon-step/IconTile.vue`
- Create: `src/components/icon-step/IconSizeGrid.vue`
- Modify: `src/App.vue` (add step panel switching)

**Interfaces:**
- Consumes: `useProjectStore`, `generateIcons`, icon size configs
- Produces: icon upload dropzone + live iOS/Android preview grids

- [ ] **Step 1: Create IconTile component**

Create `src/components/icon-step/IconTile.vue`:

```vue
<script setup lang="ts">
defineProps<{
  label: string
  size: string
  url?: string | null
}>()
</script>

<template>
  <div class="icon-tile-wrap">
    <div class="icon-tile">
      <img v-if="url" :src="url" alt="" />
      <span v-else class="icon-tile-placeholder">—</span>
    </div>
    <span class="tile-label">{{ label }}</span>
    <span class="tile-size">{{ size }}</span>
  </div>
</template>

<style scoped>
.icon-tile-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.icon-tile {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: var(--bg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-accent);
}
.icon-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.icon-tile-placeholder {
  color: var(--text-muted);
  font-size: 14px;
}
.tile-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
}
.tile-size {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
</style>
```

- [ ] **Step 2: Create IconSizeGrid component**

Create `src/components/icon-step/IconSizeGrid.vue`:

```vue
<script setup lang="ts">
import IconTile from './IconTile.vue'
import type { IconSizeEntry, IconResult } from '@/models/types'

defineProps<{
  title: string
  sizes: IconSizeEntry[]
  results: IconResult[]
}>()

function getUrl(key: string, results: IconResult[]): string | null {
  return results.find((r) => r.key === key)?.url ?? null
}
</script>

<template>
  <h3 class="sub-heading">{{ title }}</h3>
  <div class="icon-grid">
    <IconTile
      v-for="size in sizes"
      :key="size.key"
      :label="size.label"
      :size="`${size.width}×${size.height}`"
      :url="getUrl(size.key, results)"
    />
  </div>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 12px;
}
.sub-heading {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 20px 0 8px;
}
</style>
```

- [ ] **Step 3: Create IconUploader component**

Create `src/components/icon-step/IconUploader.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import { generateIcons } from '@/services/icon-generator'
import { IOS_ICON_SIZES } from '@/config/ios-icon-sizes'
import { ALL_ANDROID_SIZES } from '@/config/android-icon-sizes'
import { validateIconResolution } from '@/services/validation'
import Dropzone from '@/components/ui/Dropzone.vue'
import IconSizeGrid from './IconSizeGrid.vue'
import { ref } from 'vue'

const store = useProjectStore()
const warning = ref<string | null>(null)

async function onFiles(files: File[]) {
  const file = files[0]
  if (!file) return

  // Validate resolution
  const bitmap = await createImageBitmap(file)
  const validation = validateIconResolution(bitmap.width, bitmap.height)
  if (validation.status === 'warn') {
    warning.value = validation.message
  } else {
    warning.value = null
  }
  bitmap.close()

  const url = URL.createObjectURL(file)
  store.setIconSource(url, file)

  // Generate icon set
  const results = await generateIcons(file)
  store.setIconResults(results)
}
</script>

<template>
  <section>
    <h2 class="panel-title">Source icon</h2>
    <p class="panel-sub">
      Upload a 1024×1024 PNG. Every store size regenerates from this one file.
    </p>

    <Dropzone label="Drop file or click to browse" accept="image/png" @files="onFiles" />

    <div v-if="warning" class="warn-text" role="alert">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      {{ warning }}
    </div>

    <IconSizeGrid
      title="iOS icons"
      :sizes="IOS_ICON_SIZES"
      :results="store.iconResults"
    />

    <IconSizeGrid
      title="Android icons"
      :sizes="ALL_ANDROID_SIZES"
      :results="store.iconResults"
    />
  </section>
</template>

<style scoped>
.panel-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}
.panel-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}
.warn-text {
  font-size: 12px;
  color: var(--text-warning);
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
```

- [ ] **Step 4: Wire step panels into App.vue**

Update `src/App.vue` to import and show step panels:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import StepRail from '@/components/StepRail.vue'
import ExportButton from '@/components/ExportButton.vue'
import IconUploader from '@/components/icon-step/IconUploader.vue'

const store = useProjectStore()
</script>

<template>
  <div class="app-card">
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
        </div>
        <div>
          <div class="logo-title">Launchsheet</div>
          <div class="logo-sub">Project · {{ store.appName }}</div>
        </div>
      </div>
      <ExportButton @export="() => {}" />
    </div>
    <hr class="divider" />

    <div class="layout">
      <StepRail />
      <div class="panel">
        <IconUploader v-if="store.currentStep === 'icon'" />
        <section v-else-if="store.currentStep === 'shots'">
          <h2 class="panel-title">Screenshots</h2>
          <p class="panel-sub">Coming soon.</p>
        </section>
        <section v-else-if="store.currentStep === 'mockup'">
          <h2 class="panel-title">Mockup preview</h2>
          <p class="panel-sub">Coming soon.</p>
        </section>
        <section v-else-if="store.currentStep === 'store'">
          <h2 class="panel-title">Store preview</h2>
          <p class="panel-sub">Coming soon.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-card {
  max-width: 860px;
  margin: 0 auto;
  background: var(--surface-1);
  border-radius: 16px;
  border: 0.5px solid var(--border);
  padding: 24px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--fill-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.logo i {
  font-size: 15px;
  color: var(--on-primary);
}
.logo-title {
  font-size: 16px;
  font-weight: 500;
}
.logo-sub {
  font-size: 12px;
  color: var(--text-muted);
}
hr.divider {
  border: none;
  border-top: 0.5px solid var(--border);
  margin-bottom: 1.25rem;
}
.layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.panel {
  flex: 1;
  min-width: 0;
}
.panel-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}
.panel-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}
</style>
```

- [ ] **Step 5: Run type-check**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/icon-step/ src/App.vue
git commit -m "feat: add Step 1 — icon upload with live iOS/Android size grids"
```

---

### Task 12: Step 2 — Screenshot Upload & Validation

**Files:**
- Create: `src/components/screenshots-step/TargetSizeSelect.vue`
- Create: `src/components/screenshots-step/ShotList.vue`
- Create: `src/components/screenshots-step/FeatureGraphic.vue`
- Modify: `src/App.vue` (wire Step 2 panel)

**Interfaces:**
- Consumes: `useProjectStore`, `TARGET_SIZES`, validation
- Produces: target-size dropdown, batch upload with per-file validation rows, feature graphic upload

- [ ] **Step 1: Create TargetSizeSelect component**

Create `src/components/screenshots-step/TargetSizeSelect.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import { TARGET_SIZES } from '@/config/store-screenshot-sizes'

const store = useProjectStore()

function onChange(e: Event) {
  store.setTargetSize(Number((e.target as HTMLSelectElement).value))
}
</script>

<template>
  <div class="size-row-header">
    <label for="target-size-select">Target size</label>
    <select id="target-size-select" :value="store.targetSizeIndex" @change="onChange">
      <option
        v-for="(t, i) in TARGET_SIZES"
        :key="t.label"
        :value="i"
      >
        {{ t.label }} · {{ t.width }}×{{ t.height }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.size-row-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.size-row-header label {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.size-row-header select {
  flex: 1;
  height: var(--h-control);
  border: 0.5px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 0 10px;
  font-size: 13px;
  font-family: inherit;
  background: var(--surface-1);
  color: var(--text-primary);
  outline: none;
}
.size-row-header select:focus {
  border-color: var(--fill-primary);
}
</style>
```

- [ ] **Step 2: Create ShotList component**

Create `src/components/screenshots-step/ShotList.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import ShotRow from '@/components/ui/ShotRow.vue'

const store = useProjectStore()
</script>

<template>
  <div>
    <ShotRow
      v-for="shot in store.shots"
      :key="shot.id"
      :name="shot.name"
      :width="shot.width"
      :height="shot.height"
      :status="shot.status"
      :status-message="shot.statusMessage"
      @remove="store.removeShot(shot.id)"
    />
    <p v-if="store.shots.length === 0" class="empty-text">
      No screenshots uploaded yet.
    </p>
  </div>
</template>

<style scoped>
.empty-text {
  font-size: 13px;
  color: var(--text-muted);
  padding: 12px;
  text-align: center;
}
</style>
```

- [ ] **Step 3: Create FeatureGraphic component**

Create `src/components/screenshots-step/FeatureGraphic.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import { FEATURE_GRAPHIC_SIZE } from '@/config/store-screenshot-sizes'
import Dropzone from '@/components/ui/Dropzone.vue'
import { ref } from 'vue'

const store = useProjectStore()

function onFiles(files: File[]) {
  const file = files[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    store.setFeatureGraphic({
      file,
      url,
      width: img.naturalWidth,
      height: img.naturalHeight,
    })
  }
  img.src = url
}
</script>

<template>
  <div>
    <h3 class="sub-heading">Play Store feature graphic</h3>
    <p class="feature-desc">
      A single {{ FEATURE_GRAPHIC_SIZE.width }}×{{ FEATURE_GRAPHIC_SIZE.height }} banner
      displayed at the top of your Play Store listing.
    </p>

    <Dropzone
      label="Drop banner or click to browse"
      accept="image/*"
      :inline="true"
      @files="onFiles"
    />

    <div class="feature-row">
      <i class="fa-solid fa-image" aria-hidden="true"></i>
      <span class="feature-name">
        {{ store.featureGraphic?.file.name ?? 'No banner uploaded' }}
      </span>
      <span
        v-if="store.featureGraphic"
        class="shot-status"
        :class="store.featureGraphic.status"
        role="status"
      >
        {{ store.featureGraphic.statusMessage }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.sub-heading {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 20px 0 4px;
}
.feature-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.feature-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: var(--radius);
  margin-top: 10px;
  font-size: 13px;
}
.feature-row i {
  color: var(--text-secondary);
}
.feature-name {
  flex: 1;
  color: var(--text-muted);
}
.shot-status {
  font-size: 11px;
  font-family: var(--font-mono);
}
</style>
```

- [ ] **Step 4: Wire Step 2 into App.vue**

Replace the Step 2 placeholder `<section>` in `src/App.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import StepRail from '@/components/StepRail.vue'
import ExportButton from '@/components/ExportButton.vue'
import IconUploader from '@/components/icon-step/IconUploader.vue'
import TargetSizeSelect from '@/components/screenshots-step/TargetSizeSelect.vue'
import ShotList from '@/components/screenshots-step/ShotList.vue'
import FeatureGraphic from '@/components/screenshots-step/FeatureGraphic.vue'
import Dropzone from '@/components/ui/Dropzone.vue'

const store = useProjectStore()
</script>

<template>
  <div class="app-card">
    <div class="header">
      <div class="header-left">
        <div class="logo">
          <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
        </div>
        <div>
          <div class="logo-title">Launchsheet</div>
          <div class="logo-sub">Project · {{ store.appName }}</div>
        </div>
      </div>
      <ExportButton @export="() => {}" />
    </div>
    <hr class="divider" />

    <div class="layout">
      <StepRail />
      <div class="panel">
        <IconUploader v-if="store.currentStep === 'icon'" />

        <section v-else-if="store.currentStep === 'shots'">
          <h2 class="panel-title">Raw screenshots</h2>
          <p class="panel-sub">
            Pick a target size first, then upload. Each file is validated against it automatically.
          </p>
          <TargetSizeSelect />

          <Dropzone
            label="Drop files or click to browse"
            accept="image/*"
            :multiple="true"
            @files="(files) => {
              files.forEach(file => {
                const url = URL.createObjectURL(file)
                const img = new Image()
                img.onload = () => {
                  store.addShot({
                    id: `shot-${Date.now()}-${file.name}`,
                    name: file.name,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    file,
                    url,
                  })
                }
                img.src = url
              })
            }"
          />

          <ShotList style="margin-top: 12px" />
          <FeatureGraphic />
        </section>

        <section v-else-if="store.currentStep === 'mockup'">
          <h2 class="panel-title">Mockup preview</h2>
          <p class="panel-sub">Coming soon.</p>
        </section>
        <section v-else-if="store.currentStep === 'store'">
          <h2 class="panel-title">Store preview</h2>
          <p class="panel-sub">Coming soon.</p>
        </section>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Run type-check**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/screenshots-step/ src/App.vue
git commit -m "feat: add Step 2 — screenshot upload with target-size validation and feature graphic"
```

---

### Task 13: Step 3 — Marketing Mockup (Konva)

**Files:**
- Create: `src/components/mockup-step/MockupCard.vue`
- Create: `src/components/mockup-step/MockupRow.vue`
- Create: `src/components/mockup-step/FrameControls.vue`
- Create: `src/components/mockup-step/BackgroundControls.vue`
- Create: `src/services/mockup-composer.ts`
- Modify: `src/App.vue` (wire Step 3 panel)

**Interfaces:**
- Consumes: `useProjectStore`, Konva
- Produces: framed screenshot cards with captions, global frame/background controls

- [ ] **Step 1: Create mockup composer service (export to PNG)**

Create `src/services/mockup-composer.ts`:

```ts
import type Konva from 'konva'

export async function stageToPng(stage: Konva.Stage): Promise<Blob> {
  const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: 1 })
  const res = await fetch(dataUrl)
  return res.blob()
}
```

- [ ] **Step 2: Create FrameControls component**

Create `src/components/mockup-step/FrameControls.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import Toggle from '@/components/ui/Toggle.vue'

const store = useProjectStore()

const frameOptions = [
  { value: 'phone' as const, label: 'Phone', icon: 'fa-solid fa-mobile-screen-button' },
  { value: 'tablet' as const, label: 'Tablet', icon: 'fa-solid fa-tablet-screen-button' },
  { value: 'none' as const, label: 'None', icon: 'fa-regular fa-square' },
]
</script>

<template>
  <Toggle
    :model-value="store.mockupSettings.frame"
    :options="frameOptions"
    @update:model-value="store.setMockupFrame"
  />
</template>
```

- [ ] **Step 3: Create BackgroundControls component**

Create `src/components/mockup-step/BackgroundControls.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import Swatch from '@/components/ui/Swatch.vue'

const store = useProjectStore()

const swatches = [
  { color: '#B5D4F4', text: '#042C53', label: 'Blue' },
  { color: '#9FE1CB', text: '#04342C', label: 'Teal' },
  { color: '#F5C4B3', text: '#4A1B0C', label: 'Coral' },
  { color: '#D3D1C7', text: '#2C2C2A', label: 'Gray' },
]
</script>

<template>
  <div class="swatch-row">
    <Swatch
      v-for="s in swatches"
      :key="s.color"
      :color="s.color"
      :label="s.label"
      :selected="store.mockupSettings.bg === s.color"
      @select="store.setMockupBg(s.color, s.text)"
    />
  </div>
</template>

<style scoped>
.swatch-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}
</style>
```

- [ ] **Step 4: Create MockupCard component**

Create `src/components/mockup-step/MockupCard.vue`:

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import Konva from 'konva'

const props = defineProps<{
  shotId: string
  shotUrl: string
  shotName: string
}>()

const store = useProjectStore()
const containerRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<Konva.Stage | null>(null)

const frameWidth = computed(() =>
  store.mockupSettings.frame === 'tablet' ? 140
    : store.mockupSettings.frame === 'phone' ? 96
    : 110,
)
const frameHeight = computed(() =>
  store.mockupSettings.frame === 'tablet' ? 170
    : store.mockupSettings.frame === 'phone' ? 190
    : 170,
)
const frameRadius = computed(() =>
  store.mockupSettings.frame === 'phone' ? 18
    : store.mockupSettings.frame === 'tablet' ? 12
    : 4,
)

const caption = computed({
  get: () => store.mockupSettings.captions[props.shotId] ?? '',
  set: (val: string) => store.setMockupCaption(props.shotId, val),
})

watch(
  [() => store.mockupSettings.bg, () => store.mockupSettings.bgImage, caption, () => props.shotUrl],
  () => {
    if (!containerRef.value) return
    renderStage()
  },
  { immediate: true },
)

function renderStage() {
  if (!containerRef.value) return

  if (stageRef.value) stageRef.value.destroy()

  const stage = new Konva.Stage({
    container: containerRef.value,
    width: frameWidth.value + 28,
    height: frameHeight.value + 50,
  })

  const layer = new Konva.Layer()

  // Background
  if (store.mockupSettings.bgImage) {
    const bgImg = new Image()
    bgImg.src = store.mockupSettings.bgImage
    bgImg.onload = () => {
      const bg = new Konva.Image({
        image: bgImg,
        width: stage.width(),
        height: stage.height(),
      })
      layer.add(bg)
      layer.draw()
    }
  } else {
    layer.add(
      new Konva.Rect({
        width: stage.width(),
        height: stage.height(),
        fill: store.mockupSettings.bg,
      }),
    )
  }

  // Frame
  const frameX = (stage.width() - frameWidth.value) / 2
  const frameY = 4

  // Screenshot inside frame
  const img = new Image()
  img.src = props.shotUrl
  img.onload = () => {
    const screenImg = new Konva.Image({
      image: img,
      x: frameX + 4,
      y: frameY + 4,
      width: frameWidth.value - 8,
      height: frameHeight.value - 8,
      cornerRadius: frameRadius.value - 2,
    })
    layer.add(screenImg)

    // Frame border
    layer.add(
      new Konva.Rect({
        x: frameX,
        y: frameY,
        width: frameWidth.value,
        height: frameHeight.value,
        cornerRadius: frameRadius.value,
        stroke: store.mockupSettings.frame === 'none' ? 'transparent' : '#e2e0db',
        strokeWidth: 4,
      }),
    )

    // Caption text
    layer.add(
      new Konva.Text({
        text: caption.value,
        x: 8,
        y: frameHeight.value + 10,
        width: stage.width() - 16,
        fontSize: 11,
        fontFamily: '-apple-system, sans-serif',
        fill: store.mockupSettings.bgText,
        align: 'center',
      }),
    )

    layer.draw()
  }

  stage.add(layer)
  stageRef.value = stage
}

defineExpose({ stageRef, shotId: props.shotId })
</script>

<template>
  <div class="mockup-card">
    <div ref="containerRef" class="mockup-stage"></div>
    <input
      v-model="caption"
      class="mockup-caption-input"
      :style="{ color: store.mockupSettings.bgText }"
      :aria-label="`Caption for ${shotName}`"
    />
    <p class="mockup-filename">{{ shotName }}</p>
  </div>
</template>

<style scoped>
.mockup-card {
  width: 140px;
}
.mockup-stage {
  border-radius: 14px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.mockup-caption-input {
  width: 100%;
  font-size: 11px;
  text-align: center;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  padding: 2px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
}
.mockup-filename {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
}
</style>
```

- [ ] **Step 5: Create MockupRow component**

Create `src/components/mockup-step/MockupRow.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type Konva from 'konva'
import { useProjectStore } from '@/stores/project'
import MockupCard from './MockupCard.vue'

const store = useProjectStore()
const cards = ref<InstanceType<typeof MockupCard>[]>([])

function getStage(shotId: string): Konva.Stage | null {
  const card = cards.value.find((c) => c.shotId === shotId)
  return card?.stageRef.value ?? null
}

defineExpose({ getStage })
</script>

<template>
  <div class="mockup-row">
    <MockupCard
      v-for="shot in store.shots"
      :key="shot.id"
      ref="cards"
      :shot-id="shot.id"
      :shot-url="shot.url"
      :shot-name="shot.name"
    />
  </div>
</template>

<style scoped>
.mockup-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
</style>
```

- [ ] **Step 6: Wire Step 3 into App.vue**

Replace the Step 3 placeholder `<section>` in `src/App.vue`. Add imports and the mockup section:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import StepRail from '@/components/StepRail.vue'
import ExportButton from '@/components/ExportButton.vue'
import IconUploader from '@/components/icon-step/IconUploader.vue'
import TargetSizeSelect from '@/components/screenshots-step/TargetSizeSelect.vue'
import ShotList from '@/components/screenshots-step/ShotList.vue'
import FeatureGraphic from '@/components/screenshots-step/FeatureGraphic.vue'
import FrameControls from '@/components/mockup-step/FrameControls.vue'
import BackgroundControls from '@/components/mockup-step/BackgroundControls.vue'
import MockupRow from '@/components/mockup-step/MockupRow.vue'

const store = useProjectStore()
</script>
```

Replace the mockup placeholder with:

```vue
<section v-else-if="store.currentStep === 'mockup'">
  <h2 class="panel-title">Marketing mockup</h2>
  <p class="panel-sub">
    Frame and background apply to every screen. Edit each headline individually.
  </p>
  <FrameControls />
  <BackgroundControls />
  <MockupRow ref="mockupRowRef" />
</section>
```

Add `mockupRowRef` to the App.vue script setup (declared in Task 15's export wiring):

```ts
const mockupRowRef = ref<InstanceType<typeof MockupRow> | null>(null)
```

- [ ] **Step 7: Run type-check**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/mockup-step/ src/services/mockup-composer.ts src/App.vue
git commit -m "feat: add Step 3 — Konva marketing mockup with frames, backgrounds, captions"
```

---

### Task 14: Step 4 — Store Listing Preview

**Files:**
- Create: `src/components/store-preview-step/StoreToggle.vue`
- Create: `src/components/store-preview-step/AppStoreCard.vue`
- Create: `src/components/store-preview-step/GooglePlayCard.vue`
- Modify: `src/App.vue` (wire Step 4 panel)

**Interfaces:**
- Consumes: `useProjectStore`
- Produces: App Store and Google Play listing previews with icon + screenshots + feature graphic

- [ ] **Step 1: Create StoreToggle component**

Create `src/components/store-preview-step/StoreToggle.vue`:

```vue
<script setup lang="ts">
import Toggle from '@/components/ui/Toggle.vue'
import { ref } from 'vue'

const model = ref<'ios' | 'android'>('ios')

const storeOptions = [
  { value: 'ios' as const, label: 'App Store' },
  { value: 'android' as const, label: 'Google Play' },
]
</script>

<template>
  <div class="store-toggle-row">
    <Toggle v-model="model" :options="storeOptions" />
  </div>
</template>

<style scoped>
.store-toggle-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
</style>
```

Actually — let's simplify. Let the store-toggle state live in the parent (App.vue) via a local ref rather than a separate component. We'll fold it into the Step 4 section directly.

- [ ] **Step 2: Create AppStoreCard component**

Create `src/components/store-preview-step/AppStoreCard.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()
</script>

<template>
  <div class="store-card">
    <div class="store-card-body">
      <div class="store-app-row">
        <div class="store-icon">
          <img
            v-if="store.iconSource"
            :src="store.iconSource"
            alt="App icon"
            class="store-icon-img"
          />
          <span v-else>—</span>
        </div>
        <div class="store-meta">
          <div class="app-name">{{ store.appName }}</div>
          <div class="app-cat">Health &amp; Fitness</div>
          <div class="app-rating">★ 4.8 · 2.3k ratings</div>
        </div>
        <button class="store-get-btn">Get</button>
      </div>
      <div class="store-shots">
        <div
          v-for="shot in store.shots"
          :key="shot.id"
          class="store-shot-thumb"
        >
          <img :src="shot.url" :alt="shot.name" class="store-shot-img" />
        </div>
        <div v-if="store.shots.length === 0" class="store-shot-thumb placeholder">
          —
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.store-card {
  background: var(--surface-2);
  border-radius: 16px;
  overflow: hidden;
}
.store-card-body {
  padding: 16px;
}
.store-app-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.store-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--bg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 500;
  color: var(--text-accent);
  overflow: hidden;
}
.store-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.store-meta {
  flex: 1;
  min-width: 0;
}
.app-name {
  font-size: 15px;
  font-weight: 500;
}
.app-cat {
  font-size: 12px;
  color: var(--text-secondary);
}
.app-rating {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.store-get-btn {
  background: var(--bg-accent);
  color: var(--text-accent);
  border: none;
  border-radius: 14px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
  cursor: pointer;
}
.store-shots {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.store-shot-thumb {
  flex-shrink: 0;
  width: 60px;
  height: 120px;
  border-radius: 10px;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.store-shot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.placeholder {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 3: Create GooglePlayCard component**

Create `src/components/store-preview-step/GooglePlayCard.vue`:

```vue
<script setup lang="ts">
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()
</script>

<template>
  <div class="store-card">
    <div
      class="feature-banner"
      :style="store.featureGraphic
        ? { backgroundImage: `url(${store.featureGraphic.url})` }
        : {}"
    >
      {{ store.featureGraphic ? '' : 'Feature graphic · 1024×500' }}
    </div>
    <div class="store-card-body">
      <div class="store-app-row">
        <div class="store-icon sm">
          <img
            v-if="store.iconSource"
            :src="store.iconSource"
            alt="App icon"
            class="store-icon-img"
          />
          <span v-else>—</span>
        </div>
        <div class="store-meta">
          <div class="app-name">{{ store.appName }}</div>
          <div class="app-cat">Launchsheet Labs</div>
          <div class="app-rating">★ 4.6 · 10k+ downloads</div>
        </div>
        <button class="store-install-btn">Install</button>
      </div>
      <div class="store-shots">
        <div
          v-for="shot in store.shots"
          :key="shot.id"
          class="store-shot-thumb"
        >
          <img :src="shot.url" :alt="shot.name" class="store-shot-img" />
        </div>
        <div v-if="store.shots.length === 0" class="store-shot-thumb placeholder">
          —
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.store-card {
  background: var(--surface-2);
  border-radius: 16px;
  overflow: hidden;
}
.feature-banner {
  height: 80px;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 11px;
  background-size: cover;
  background-position: center;
}
.store-card-body {
  padding: 16px;
}
.store-app-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.store-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--bg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 500;
  color: var(--text-accent);
  overflow: hidden;
}
.store-icon.sm {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 18px;
}
.store-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.store-meta {
  flex: 1;
  min-width: 0;
}
.app-name {
  font-size: 15px;
  font-weight: 500;
}
.app-cat {
  font-size: 12px;
  color: var(--text-secondary);
}
.app-rating {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.store-install-btn {
  border: 0.5px solid var(--border-strong);
  background: transparent;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 13px;
  flex-shrink: 0;
  cursor: pointer;
}
.store-shots {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.store-shot-thumb {
  flex-shrink: 0;
  width: 62px;
  height: 110px;
  border-radius: 8px;
  background: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.store-shot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.placeholder {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 4: Wire Step 4 into App.vue**

Replace the Step 4 placeholder in `src/App.vue`. Add imports:

```ts
import AppStoreCard from '@/components/store-preview-step/AppStoreCard.vue'
import GooglePlayCard from '@/components/store-preview-step/GooglePlayCard.vue'
```

Add a local `ref` in script setup:

```ts
import { ref } from 'vue'
const previewStore = ref<'ios' | 'android'>('ios')
```

Replace the store placeholder section:

```vue
<section v-else-if="store.currentStep === 'store'">
  <h2 class="panel-title">Store listing preview</h2>
  <p class="panel-sub">
    How your icon and screenshots read on each store's product page.
  </p>

  <div class="store-toggle-row">
    <button
      class="toggle-btn"
      :class="{ selected: previewStore === 'ios' }"
      @click="previewStore = 'ios'"
    >
      App Store
    </button>
    <button
      class="toggle-btn"
      :class="{ selected: previewStore === 'android' }"
      @click="previewStore = 'android'"
    >
      Google Play
    </button>
  </div>

  <AppStoreCard v-if="previewStore === 'ios'" />
  <GooglePlayCard v-else />
</section>
```

Add scoped styles:

```css
.store-toggle-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.toggle-btn {
  cursor: pointer;
  font: inherit;
  background: var(--surface-2);
  border: 0.5px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 12px;
  color: var(--text-primary);
  font-size: 13px;
}
.toggle-btn.selected {
  border: 2px solid var(--fill-primary);
  color: var(--text-accent);
}
```

- [ ] **Step 5: Run type-check**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/store-preview-step/ src/App.vue
git commit -m "feat: add Step 4 — App Store and Google Play listing preview"
```

---

### Task 15: JSZip Export Pipeline

**Files:**
- Create: `src/services/zip-exporter.ts`
- Create: `src/services/__tests__/zip-exporter.spec.ts`
- Modify: `src/components/ExportButton.vue` (wire export)

**Interfaces:**
- Consumes: `useProjectStore`, `generateIcons`, `batchResize`, JSZip
- Produces: `exportAll(store) → Promise<Blob>` producing correctly-structured zip

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/zip-exporter.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildZipStructure } from '../zip-exporter'

describe('buildZipStructure', () => {
  it('creates iOS AppIcon.appiconset folder', async () => {
    const zip = new JSZip()
    const iconResults = [
      { key: 'appstore', blob: new Blob(['fake']), url: '' },
      { key: 'iphone-60-2x', blob: new Blob(['fake']), url: '' },
    ]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.startsWith('ios/AppIcon.appiconset/'))).toBe(true)
  })

  it('creates Android mipmap folders', async () => {
    const zip = new JSZip()
    const iconResults = [
      { key: 'mdpi', blob: new Blob(['fake']), url: '' },
      { key: 'hdpi', blob: new Blob(['fake']), url: '' },
    ]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.startsWith('android/mipmap-mdpi/'))).toBe(true)
    expect(files.some((f) => f.startsWith('android/mipmap-hdpi/'))).toBe(true)
  })

  it('creates Contents.json', async () => {
    const zip = new JSZip()
    const iconResults = [
      { key: 'appstore', blob: new Blob(['fake']), url: '' },
    ]
    buildZipStructure(zip, { iconResults, shots: [], featureGraphic: null, mockupImages: [] })
    const files = Object.keys(zip.files)
    expect(files.some((f) => f.endsWith('Contents.json'))).toBe(true)
  })

  it('creates feature-graphic.png when provided', async () => {
    const zip = new JSZip()
    buildZipStructure(zip, {
      iconResults: [],
      shots: [],
      featureGraphic: new Blob(['fake-banner']),
      mockupImages: [],
    })
    const files = Object.keys(zip.files)
    expect(files).toContain('android/feature-graphic.png')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm run test:unit -- src/services/__tests__/zip-exporter.spec.ts
```

Expected: FAIL — `buildZipStructure` not defined.

- [ ] **Step 3: Implement zip exporter**

Create `src/services/zip-exporter.ts`:

```ts
import JSZip from 'jszip'
import type { IconResult, Shot } from '@/models/types'
import { IOS_ICON_SIZES } from '@/config/ios-icon-sizes'
import { ANDROID_LAUNCHER_SIZES } from '@/config/android-icon-sizes'
import { TARGET_SIZES } from '@/config/store-screenshot-sizes'

interface ZipInput {
  iconResults: IconResult[]
  shots: Shot[]
  featureGraphic: Blob | null
  mockupImages: { id: string; blob: Blob; name: string }[]
}

function getDensityKey(key: string): string | null {
  const map: Record<string, string> = {
    mdpi: 'mdpi',
    hdpi: 'hdpi',
    xhdpi: 'xhdpi',
    xxhdpi: 'xxhdpi',
    xxxhdpi: 'xxxhdpi',
  }
  return map[key] ?? null
}

function generateContentsJson(): string {
  const images = IOS_ICON_SIZES.map((s) => {
    const scale = s.key.includes('-3x') ? '3x' : s.key.includes('-2x') ? '2x' : '1x'
    const sizeStr = s.key.includes('appstore')
      ? '1024x1024'
      : `${s.key.match(/\d+/)?.[0] ?? s.width}x${s.key.match(/\d+/)?.[0] ?? s.height}`
    return {
      size: sizeStr,
      idiom: 'universal',
      filename: `app_icon_${s.width}x${s.height}.png`,
      scale,
    }
  })
  return JSON.stringify({ images }, null, 2)
}

export function buildZipStructure(zip: JSZip, input: ZipInput): void {
  // iOS icons
  const iosFolder = zip.folder('ios')!.folder('AppIcon.appiconset')!
  for (const result of input.iconResults) {
    const iosEntry = IOS_ICON_SIZES.find((s) => s.key === result.key)
    if (iosEntry) {
      iosFolder.file(`app_icon_${iosEntry.width}x${iosEntry.height}.png`, result.blob)
    }
  }
  if (input.iconResults.some((r) => IOS_ICON_SIZES.some((s) => s.key === r.key))) {
    iosFolder.file('Contents.json', generateContentsJson())
  }

  // Android icons
  const android = zip.folder('android')!
  for (const result of input.iconResults) {
    const launcherEntry = ANDROID_LAUNCHER_SIZES.find((s) => s.key === result.key)
    if (launcherEntry) {
      const density = launcherEntry.key === 'play-store' ? null : launcherEntry.key
      if (density) {
        android.folder(`mipmap-${density}`)!.file('ic_launcher.png', result.blob)
      } else {
        android.file('play-store-icon.png', result.blob)
      }
    }
  }

  // Feature graphic
  if (input.featureGraphic) {
    android.file('feature-graphic.png', input.featureGraphic)
  }

  // Screenshots
  const appstore = zip.folder('screenshots')!.folder('appstore')!
  const playstore = zip.folder('screenshots')!.folder('playstore')!

  for (let i = 0; i < input.shots.length; i++) {
    const shot = input.shots[i]!
    const idx = String(i + 1).padStart(2, '0')
    // Use mockup image if available, else raw file
    const mockup = input.mockupImages.find((m) => m.id === shot.id)
    if (mockup) {
      playstore.file(`${idx}_${shot.name}`, mockup.blob)
      appstore.file(`${idx}_${shot.name}`, mockup.blob)
    } else {
      playstore.file(`${idx}_${shot.name}`, shot.file)
      appstore.file(`${idx}_${shot.name}`, shot.file)
    }
  }

  // Marketing mockups
  if (input.mockupImages.length > 0) {
    const marketing = zip.folder('marketing')!
    for (const m of input.mockupImages) {
      marketing.file(m.name, m.blob)
    }
  }
}

export async function exportAll(input: ZipInput): Promise<Blob> {
  const zip = new JSZip()
  buildZipStructure(zip, input)
  return zip.generateAsync({ type: 'blob' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm run test:unit -- src/services/__tests__/zip-exporter.spec.ts
```

Expected: all PASS.

- [ ] **Step 5: Wire export into ExportButton**

Update `src/components/ExportButton.vue` to accept an `exporting` prop:

```vue
<script setup lang="ts">
defineProps<{
  disabled?: boolean
  exporting?: boolean
}>()

const emit = defineEmits<{
  export: []
}>()
</script>

<template>
  <button class="btn-primary" :disabled="disabled || exporting" @click="emit('export')">
    <i class="fa-solid fa-download" aria-hidden="true"></i>
    {{ exporting ? 'Exporting…' : 'Export all' }}
  </button>
</template>

<style scoped>
.btn-primary {
  background: var(--fill-primary);
  color: var(--on-primary);
  border: none;
  height: var(--h-control);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary:focus-visible {
  outline: 2px solid var(--fill-primary);
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 6: Add export handler in App.vue**

Update `src/App.vue` script setup to add:

```ts
import { ref } from 'vue'
import { exportAll } from '@/services/zip-exporter'
import { stageToPng } from '@/services/mockup-composer'

const exporting = ref(false)

// Ref to MockupRow for capturing Konva stages
const mockupRowRef = ref<InstanceType<typeof MockupRow> | null>(null)

async function handleExport() {
  exporting.value = true
  try {
    // Capture mockup PNGs from the Konva stages if mockups were built
    const mockupImages: { id: string; blob: Blob; name: string }[] = []
    if (store.readySteps.mockup && mockupRowRef.value) {
      for (const shot of store.shots) {
        const stage = mockupRowRef.value.getStage(shot.id)
        if (stage) {
          const blob = await stageToPng(stage)
          mockupImages.push({ id: shot.id, blob, name: shot.name })
        }
      }
    }

    const blob = await exportAll({
      iconResults: store.iconResults,
      shots: store.shots,
      featureGraphic: store.featureGraphic?.file ?? null,
      mockupImages,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.appName.replace(/\s+/g, '-').toLowerCase()}-assets.zip`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
```

Add `getStage` to `MockupRow` via `defineExpose`. After the `<MockupCard v-for>` in `MockupRow.vue` script, add a template ref and expose the stage lookup:

```ts
import { ref } from 'vue'
const cards = ref<InstanceType<typeof MockupCard>[]>([])

function getStage(shotId: string): Konva.Stage | null {
  const card = cards.value.find((c) => c.shotId === shotId)
  return card?.stageRef.value ?? null
}

defineExpose({ getStage })
```

And add `shotId` to MockupCard's `defineExpose` alongside `stageRef`.

Import `MockupRow` in `App.vue` and bind it on the `<MockupRow ref="mockupRowRef" />` element.

Update the ExportButton in the template:

```vue
<ExportButton :exporting="exporting" @export="handleExport" />
```

- [ ] **Step 7: Run type-check**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/services/zip-exporter.ts src/services/__tests__/zip-exporter.spec.ts src/components/ExportButton.vue src/App.vue
git commit -m "feat: add JSZip export pipeline with correct folder structure"
```

---

### Task 16: Font Awesome & Final Wiring

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: none
- Produces: Font Awesome icons available app-wide

- [ ] **Step 1: Add Font Awesome CDN to index.html**

Update `index.html` `<head>`:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
```

- [ ] **Step 2: Verify full build and type-check**

```bash
pnpm run type-check && pnpm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Font Awesome CDN for icon glyphs"
```

---

### Task 17: E2E Smoke Test (Playwright)

**Files:**
- Modify: `e2e/vue.spec.ts`

**Interfaces:**
- Consumes: full app running on dev server
- Produces: Playwright test covering happy path

- [ ] **Step 1: Write the Playwright e2e test**

Replace `e2e/vue.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('Launchsheet loads and shows all four steps', async ({ page }) => {
  await page.goto('/')

  // Header renders
  await expect(page.locator('.logo-title')).toHaveText('Launchsheet')

  // Step rail shows 4 steps
  await expect(page.locator('.step-btn')).toHaveCount(4)

  // Starts at step 1 (Icon)
  await expect(page.locator('#panel-icon')).toBeVisible()

  // Navigate to step 2
  await page.click('.step-btn:nth-child(2)')
  await expect(page.locator('#panel-shots')).toBeVisible()

  // Navigate to step 3
  await page.click('.step-btn:nth-child(3)')
  await expect(page.locator('#panel-mockup')).toBeVisible()

  // Navigate to step 4
  await page.click('.step-btn:nth-child(4)')
  await expect(page.locator('#panel-store')).toBeVisible()
})
```

- [ ] **Step 2: Run e2e tests**

```bash
pnpm run test:e2e
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/vue.spec.ts
git commit -m "test: add Playwright e2e smoke test for 4-step navigation"
```

---

### Task 18: Lint, Format, and Final Verification

**Files:**
- No new files (cleanup pass)

- [ ] **Step 1: Run linters**

```bash
pnpm run lint
```

Fix any lint errors.

- [ ] **Step 2: Run formatter**

```bash
pnpm run format
```

- [ ] **Step 3: Run full unit test suite**

```bash
pnpm run test:unit
```

Expected: all PASS.

- [ ] **Step 4: Run type-check**

```bash
pnpm run type-check
```

Expected: no errors.

- [ ] **Step 5: Run full build**

```bash
pnpm run build
```

Expected: clean build, no warnings.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: lint, format, final verification pass"
```
