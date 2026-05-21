---
name: a2a-ui-release
description: Use when changing npm packaging, CLI startup, standalone Next.js packaging, GitHub Actions release automation, versioning, npm publish, or GitHub Releases for the A2A UI package.
metadata:
  short-description: Release A2A UI
---

# A2A UI Release Workflow

## Package Boundary

- Publish the root package `a2a-ui`; do not publish `server/`.
- The CLI entry is `bin/a2a-ui.mjs`.
- The root `files` allowlist controls npm package contents. Check it when adding runtime files.
- `npm publish` runs `prepack`, which runs `npm run build` and prepares `.next/standalone` through `scripts/prepare-standalone.mjs`.

## Release Automation

- GitHub release automation lives in `.github/workflows/release.yml`.
- Releases are tag driven. A tag like `v0.8.4` must match root `package.json` version `0.8.4`.
- The workflow uses npm Trusted Publishing through GitHub OIDC. Do not add long-lived npm publish tokens unless the user explicitly rejects Trusted Publishing.
- Configure npm package settings with GitHub Actions trusted publisher:
  - owner/repo: `iChintanSoni/a2a-ui`
  - workflow filename: `release.yml`
  - allowed action: `npm publish`

## Human Release Steps

1. Update version with `npm version patch`, `npm version minor`, or `npm version major`.
2. Push the commit and tag with `git push origin main --follow-tags`.
3. Confirm the GitHub Actions release workflow publishes npm and creates the GitHub Release.

## Validation

- Before publishing, run `npm run lint`, `npm run typecheck`, `npm run test`, and the server typecheck when relevant.
- Use `npm pack --dry-run` when changing package contents.
- After publishing, verify `npx a2a-ui --version` and a basic `npx a2a-ui --port <port>` startup when practical.
