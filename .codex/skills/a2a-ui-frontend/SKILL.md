---
name: a2a-ui-frontend
description: Use when implementing or reviewing the A2A UI Next.js dashboard, App Router pages, chat/debug components, Redux slices, A2A protocol rendering, QA Harness, or frontend tests.
metadata:
  short-description: Build A2A UI frontend
---

# A2A UI Frontend

## Main Areas

- App Router pages live under `app/`; dashboard pages are under `app/dashboard/`.
- Shared dashboard UI lives in `components/`; A2A chat/debug rendering lives in `components/chat/`.
- Headless client primitives live in `hooks/`: connection, session, messages, and debug hooks.
- Redux state lives in `lib/features/` for agents, chats, QA, and workbench state.
- Protocol helpers live in `lib/a2a/`; utility and persistence helpers live in `lib/utils/`, `lib/persistence.ts`, and `lib/store.ts`.

## Implementation Defaults

- Keep the workbench dense, inspectable, and developer-focused rather than marketing-like.
- Reuse existing shadcn/Radix components and lucide icons.
- Preserve browser-local persistence and explicit import/export flows.
- Keep A2A message parts, task events, artifacts, and tool calls inspectable through existing debug surfaces.
- When changing chat/session behavior, check the related hook, slice, renderer, and tests together.

## Tests

- Component and hook tests use Vitest, Testing Library, and `happy-dom`.
- Add or update tests near existing coverage in `tests/hooks/`, `tests/lib/`, or `tests/app/`.
- For route-level smoke coverage, update `e2e/app-smoke.spec.ts` when user-visible dashboard navigation changes.

## Commands

- Root install: `npm ci`.
- Fast checks: `npm run typecheck` and targeted `npm run test -- <pattern>`.
- Full frontend confidence: `npm run lint`, `npm run test`, and `npm run build`.
