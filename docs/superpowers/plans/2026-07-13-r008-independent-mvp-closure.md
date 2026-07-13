# R-008 Independent MVP Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify the frozen Recrafts loop from an installed immutable `0.4.0-rc.1-build1` across image, image-set, and a real public URL.

**Architecture:** Package a dependency-declared Chromium capture adapter that exports typed source Evidence and complete/partial status without visual inference. Compose installed-RC run reports and sanitized real Host/browser evidence into a separate immutable review Bundle, then derive closure/readiness mechanically from mandatory gates. Failed mandatory gates preserve Build 1 as blocked and keep CraftsOS holding pending.

**Tech Stack:** Node.js 20+, ESM, Playwright Core/Chromium, JSON/JSONL, SHA-256, npm tarball, `node:test`, Darwin shell, available Linux container/CI runner.

---

### Task 1: Browser capture contract

- [ ] Add RED tests for complete Evidence classes, separate screenshot/DOM records, missing screenshot/computed-style downgrade, and fixture/live anti-spoofing.
- [ ] Implement `runtime/browser_capture.mjs` with public-target safety, one-route/viewport limits, network metadata, DOM/CSS/computed styles, screenshots/regions, assets/fonts, freshness, and capture logs.
- [ ] Package adapter code and declare exact browser prerequisite/version.
- [ ] Run contract tests GREEN.

### Task 2: Real URL and Host evidence

- [ ] Capture `https://www.craft.do` outside the source repository with real Chromium and record capture ID/hashes.
- [ ] Inspect the actual screenshot with the vision-capable Codex Host, store raw output separately, and submit structured Evidence-bound Claims.
- [ ] Record Host agent/engine/capability, prompt/instruction/input hashes, timestamps, human edits, and raw/structured paths.
- [ ] Fail the gate if required URL Evidence is missing or the Host run cannot be audited.

### Task 3: Installed cross-input closure

- [ ] Pack a development candidate to `/tmp`, install it outside the repository, and execute single-image acceptance.
- [ ] Execute multi-image real Host Claims, explicit high conflict, failed acceptance, correction, acceptance, later correction/acceptance, rollback, and hash validation.
- [ ] Execute real URL correction/acceptance plus packaged partial/blocked/stale lifecycle runs.
- [ ] Write stable response/error evidence and closure matrix rows with real run/package/Artifact/decision IDs.

### Task 4: Platform and distribution qualification

- [ ] Run native Darwin installed-Tarball closure and capture OS/arch/Node/npm/browser/tarball data.
- [ ] Run the same immutable Tarball in an available isolated Linux environment; if none exists, record `not-tested` and block readiness.
- [ ] Audit `npm pack --json`, secrets, private paths, raw Host exclusion, browser state exclusion, and required inventory.
- [ ] Generate checksums and immutable `recrafts-0.4.0-rc.1-build1` only once.

### Task 5: Closure and review artifacts

- [ ] Generate conflict, acceptance, rollback, URL, Host, platform, distribution, closure matrix, and readiness reports from actual results.
- [ ] Create the portable sanitized Bundle and verify all internal hashes.
- [ ] Run R-001→R-007 regressions and final RC validator.
- [ ] Create Result, independent Review Packet, project-owner review form, and `PENDING` CraftsOS holding decision unless both later reviews pass.
