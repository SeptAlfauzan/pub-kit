# Launchsheet — Design Spec

**Author:** Design collaboration (Septa Alfauzan + opencode)
**Status:** Approved
**Date:** 2026-09-02
**Source PRD:** `launchsheet-ui.html` prototype + attached PRD

## 1. Overview

A client-side-only web app for generating all visual assets required to submit an app to the Apple App Store and Google Play Store, from a single source image/screenshot set. Four-step wizard: icon generator, screenshot resizer + feature graphic, marketing mockup composer, and store listing preview — all in-browser, no backend.

Faithful visual port of the `launchsheet-ui.html` prototype (warm-neutral palette, monospace size labels, 8px radius scale, 36px control height, CSS custom properties).

## 2. Stack

- Vue 3 (Composition API, `<script setup lang="ts">`) + TypeScript strict
- Vite 8 (existing scaffold), Pinia, Vue Router
- Konva (mockup composer — device frames + caption text layers)
- JSZip (client-side export)
- Web Workers via OffscreenCanvas (icon/screenshot processing) — still fully client-side; workers are browser threads, zero server
- Existing: Vitest + @vue/test-utils (unit/component), Playwright (e2e), oxlint + ESLint + Prettier

## 3. Architecture — Approach A: feature-sliced + single Pinia store

```
src/
  config/
    ios-icon-sizes.ts        # single source of truth for iOS sizes
    android-icon-sizes.ts    # Android launcher + adaptive sizes
    store-screenshot-sizes.ts# target-size dropdown entries
  models/
    types.ts                 # Project, Shot, IconResult, MockupSettings, etc.
  services/
    worker-pool.ts           # round-robin pool of OffscreenCanvas workers
    icon-generator.ts        # dispatch gen-icons jobs, assemble results
    screenshot-resizer.ts    # dispatch resize-shot jobs
    mockup-composer.ts       # Konva stage → PNG (main thread)
    zip-exporter.ts          # JSZip assembly
    workers/
      icon.worker.ts
      screenshot.worker.ts
  components/
    ui/                      # Dropzone, Toggle, Swatch, ShotRow, ...
    icon-step/               # IconUploader, IconSizeGrid, IconTile
    screenshots-step/        # TargetSizeSelect, ShotList, ShotRow, FeatureGraphic
    mockup-step/             # FrameControls, BackgroundControls, MockupCard, MockupRow
    store-preview-step/      # StoreToggle, AppStoreCard, GooglePlayCard
    StepRail.vue
    ExportButton.vue
  stores/
    project.ts               # single Pinia store
  App.vue
public/
  frames/                    # device bezel SVG/PNG assets
```

Single `useProjectStore` holds: `currentStep`, `appName`, `iconSources` (fg/bg), `iconResults`, `targetSizeIndex`, `shots[]`, `featureGraphic`, `mockupSettings` (frame, bg, bgImage, per-shot captions), and derived `readySteps` / `readyCount` / `exportReady`.

### Worker pool, at a glance

- `navigator.hardwareConcurrency`-based, capped at 4, round-robin dispatch
- Job protocol: POST `{ id, op, payload, transferables }` → reply `{ id, status, result | error }`
- `ImageBitmap`/`ArrayBuffer` transferred zero-copy where supported
- `cancelledJobs` Set for cancellation on new upload / target-switch
- `terminate()` on unmount / HMR
- **Client-side only**: workers are browser threads, no backend; assets never leave the machine

```
project.zip
  ios/AppIcon.appiconset/        icons + Contents.json (generated from ios-icon-sizes.ts)
  android/mipmap-*/              launcher icons per density
  android/ic_launcher_{foreground,background}.xml
  android/feature-graphic.png    (1024x500)
  screenshots/appstore/*.png
  screenshots/playstore/*.png
  marketing/*.png
```

## 4. Steps & Data Flow

### Step 1 — Icon
Upload one source (recommended 1024x1024 PNG, min 512), or fg/bg layers for Android adaptive. Validate min resolution as a warn (not block). Live grids (iOS/Android) show every generated size with purpose + mono dims. Auto-generate solid/photo background if only foreground supplied.

Config tables (`ios-icon-sizes.ts`, `android-icon-sizes.ts`) cover: iOS App Store 1024, iPhone 60/29/40/20 at 1x/2x/3x, iPad 76/20/40/29 at 1x/2x, iPad Pro 83.5@2x → 167; Android launcher mdpi–xxxhdpi (48–192) + Play 512, adaptive fg layers 108–432.

### Step 2 — Screenshots (target-first validation)
Target size selected from dropdown **before** upload. Options: iPhone 6.9" (1320×2868), iPhone 6.5" (1284×2778), iPad Pro 13" (2064×2752), Android phone (1080×1920), Android 7" tablet (1200×1920), Android 10" tablet (1600×2560).

**Validation rules:**
- iOS targets: exact dimension match (portrait **or** landscape orientation — e.g. 1320×2868 or 2868×1320 both pass)
- **Android: aspect ratio must be 16:9 or 9:16, and each side between 320px and 3840px**

Each shot row: icon, filename, detected dims, color-coded status (green pass / amber warn with expected dims), color + text only. Switching dropdown re-validates all rows via a derived computed — one pure `validateShot(shot, sizeIndex)`.

Smart-crop to target ratio, or letterbox/pad-to-fit; manual crop/reposition per image before export. Locale folders are **v2** (deferred).

Feature graphic: dedicated 1024×500 upload slot, same inline pass/warn validation; populates Play listing banner + `/android/feature-graphic.png`.

### Step 3 — Marketing mockup (Konva, main thread)
- Device frame library bundled in `public/frames` (SVG/PNG), not fetched per request
- Frame (phone/tablet/none) + background (preset swatches or custom image) apply globally to all cards at once — immediate, no confirmation modal
- Per-screen caption inputs, independently editable, render live in each card's text layer
- All cards visible simultaneously in a wrapping horizontal row — no carousel
- Export one framed image per screen

### Step 4 — Store listing preview
Toggle App Store / Google Play. Structural approximation (not licensed reproduction). Icon reflects Step-1 source in real time; screenshot strip uses mockup composites if built, else raw uploads; Play banner populated from feature graphic (placeholder if none). Read-only — edits happen in earlier steps.

### Step rail & export
- 4 numbered buttons; readiness checkmark per step after meaningful interaction; "N of 3 steps ready" counter (store preview is read-only).
- Always-available Export All → single zip; progress N/total on ExportButton.

## 5. Key Behaviors

- **Identity:** every entity (shot, icon size, caption, job) keyed by `id`; no index-based references.
- **Keyboard:** dropzones focusable via Enter/Space; toggles, dropdowns, caption inputs, remove buttons all operable; visible focus rings.
- **Empty states:** guided per-step empty states, never blank; loading skeletons for async work.
- **Status:** always color + text, never color alone.

## 6. Error Handling

- **Upload failure** (bad type / unreadable): inline error, excluded from batch.
- **Decode failure:** inline warn, excluded.
- **Worker failure:** retry N times, then job-level error toast + incomplete step + retry button on affected cards.
- **Export:** per-file isolation — failing file logged/skipped, partial zip downloads with a warning banner listing missing files; total failure → banner, no silent partials.
- **Cancellation:** new upload / target-switch cancels in-flight batch; stale results never overwrite newer state.

## 7. Performance

- Single icon batch < ~1.5s; screenshot batch (~20) < ~4s on a mid-range laptop.
- Heavy bg ops in workers; UI never blocks on icon/screenshot work (Konva mockups main-thread, small N).
- Round-robin worker pool, transferable zero-copy, HMR/unmount terminate.

## 8. Testing

- **Unit (Vitest):** `validateShot` (incl. Android 16:9/9:16 + 320–3840 boundary cases), size-config integrity, worker job dispatch/cancel, zip folder structure.
- **Component (@vue/test-utils):** Dropzone emit+keyboard, ShotRow status, StepRail readiness, StoreToggle.
- **E2E (Playwright):** happy path — icon → target → shots → mockup caption → store toggle → export download; plus a dimension-mismatch warn case.

## 9. Non-Goals (v1)

- Backend / accounts / saved projects (localStorage session stopgap only)
- Native app; App-Store-Connect / Play-Console auto-upload; video previews; team features
- AI icon generation (source assumed to exist)
- Locale folders, macOS/watchOS icon sizes