---
name: release
description: Use when cutting an a2a-ui release, bumping the version, publishing to npm, editing .github/workflows/release.yml, changing the package.json files allowlist, or touching bin/a2a-ui.mjs and the standalone packaging. Carries the repo-specific invariants the generic release commands do not know.
---

# Releasing a2a-ui

Releases are **tag-driven**: pushing a `v<x.y.z>` tag runs
[`.github/workflows/release.yml`](../../../.github/workflows/release.yml), which
publishes to npm and creates the GitHub Release. There is nothing to publish by
hand.

## The one invariant that breaks releases

The workflow refuses to publish unless the tag exactly matches the root
`package.json` version. **Bump the version on `main` and push it before the tag
exists** — a tag created on an unbumped commit fails the job and has to be
deleted and recreated.

## Steps

1. Pick the new version (patch / minor / major — ask if the user has not said).
2. `npm version <x.y.z> --no-git-tag-version` — bumps `package.json` and
   `package-lock.json` without creating a tag.
3. `git commit -am "chore: bump version to <x.y.z>"` then `git push origin main`.
4. Compose the release notes. The user-level `/create-release` command handles
   note composition from merged PRs; this skill only owns the invariants.
5. `gh release create v<x.y.z> --target main --title "v<x.y.z>" --notes "…"` —
   this creates the tag on the bumped commit and fires the workflow.
6. Watch the run (`gh run watch`). It re-runs lint, both typechecks, unit tests,
   and the Playwright smoke suite before publishing, so a red `main` blocks the
   release.

Omitting `--notes`/`--generate-notes` is fine — the workflow falls back to
`gh release create --verify-tag --generate-notes` if the release does not exist
yet.

## Publishing credentials

npm publish uses **Trusted Publishing via GitHub OIDC** — no token is stored.
The npm package is configured with the GitHub Actions trusted publisher:

- owner/repo: `iChintanSoni/a2a-ui`
- workflow filename: `release.yml`

Never add a long-lived `NPM_TOKEN` secret. If publishing fails on auth, the fix
is in the npm package settings, not in the workflow.

## Package boundary

- Only the root package `a2a-ui` is published. `server/` is a separate,
  unpublished demo package.
- `npm publish` runs `prepack` → `npm run build` → `scripts/prepare-standalone.mjs`,
  which stages `.next/standalone` for the `npx a2a-ui` CLI (`bin/a2a-ui.mjs`).
- `package.json` `files` is an explicit **allowlist**. Any new top-level
  directory a consumer needs, or a new `scripts/*.mjs` used at pack time, must be
  added there or it silently will not ship. Run `npm pack --dry-run` whenever
  that list or the set of runtime files changes, and check the output actually
  contains the new paths.

## After publishing

- `npx a2a-ui@<x.y.z> --version` — confirms the CLI resolves and the standalone
  bundle shipped.
- `npx a2a-ui@<x.y.z> --port 3010` — confirms the server actually boots, which
  `--version` alone does not prove.
