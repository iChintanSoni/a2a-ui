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

## Release Steps

The release workflow verifies that `package.json` version matches the tag before publishing.
**Always bump the version and push to main BEFORE creating the tag/release.**

### When assisting the user with `/create-release`:

1. Determine the new version (ask the user if not specified: patch / minor / major).
2. Run `npm version <new-version> --no-git-tag-version` to bump `package.json` and `package-lock.json`.
3. Commit: `git commit -am "chore: bump version to <new-version>"` and push to main: `git push origin main`.
4. Collect PRs and compose release notes (see steps above).
5. Create the GitHub release with `gh release create <tag> --target main ...` — this creates the tag on the version-bumped commit.
6. The CI workflow fires, verifies the tag matches `package.json`, runs checks, and publishes to npm automatically.

### Manual steps (without Claude):

1. `npm version patch|minor|major` (or `npm version <x.y.z> --no-git-tag-version` for an exact version).
2. `git push origin main`.
3. `gh release create v<x.y.z> --target main --title "v<x.y.z>" --notes "<notes>"`.
4. Confirm the GitHub Actions release workflow publishes npm and creates the GitHub Release.

## Validation

- Before publishing, run `npm run lint`, `npm run typecheck`, `npm run test`, and the server typecheck when relevant.
- Use `npm pack --dry-run` when changing package contents.
- After publishing, verify `npx a2a-ui --version` and a basic `npx a2a-ui --port <port>` startup when practical.
