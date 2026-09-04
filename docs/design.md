# Design Guide

The a2a-ui design system lives in [`app/globals.css`](../app/globals.css) and
[`components.json`](../components.json). This document explains the intent
behind it so new surfaces look like they belong.

[docs/accessibility.md](accessibility.md) is part of this guide, not an
appendix — a surface that fails keyboard operability or focus visibility is not
finished, however it looks.

---

## Tone

**A dense, inspectable, developer-workbench UI — not a marketing site.**

Everything follows from that:

- Information density over whitespace. `text-sm` is the body size and `text-xs`
  is normal for metadata; `text-base` and larger are reserved for page headings.
- Raw protocol data is always reachable. Message parts, task events, artifacts,
  and tool calls each keep an inspect affordance that surfaces the underlying
  JSON — never hide the wire format behind a summary.
- No hero sections, no illustrations, no persuasion copy. Labels are nouns,
  buttons are verbs.
- The user's data stays local and explicit. Import/export flows are visible and
  manual; nothing syncs anywhere.

---

## Tokens

Colors are **semantic CSS variables in oklch**, defined twice in
`app/globals.css` — once on `:root` and once on `.dark` — and exposed to
Tailwind through the `@theme inline` block.

**Use the semantic token, never a raw color.** `bg-surface-2`, not
`bg-neutral-100`; `text-fg-subtle`, not `text-gray-500`. A raw Tailwind color
looks right in one theme and wrong in the other, and it silently opts out of
every future palette change.

| Token                                     | Use it for                                                |
| ----------------------------------------- | --------------------------------------------------------- |
| `background` / `foreground`               | The page itself                                           |
| `card` / `card-foreground`                | Raised panels and list rows                               |
| `surface-2`                               | Recessed areas inside a card — code blocks, table headers |
| `muted` / `muted-foreground` (`fg-muted`) | De-emphasized blocks and secondary text                   |
| `fg-subtle`                               | Tertiary text — timestamps, counts, hints                 |
| `primary`                                 | The brand green; the single accent for primary actions    |
| `brand-soft` / `brand-soft-foreground`    | Tinted brand chips and active nav items                   |
| `warning-soft` / `warning-foreground`     | Non-fatal protocol warnings and degraded states           |
| `destructive` / `destructive-soft`        | Errors and destructive actions                            |
| `border` / `border-strong`                | Hairlines; `border-strong` for deliberate separation      |
| `ring`                                    | Focus rings — never restyle these away                    |

Radii derive from a single `--radius` (`0.625rem`) — `rounded-sm` through
`rounded-4xl` are all computed from it, so changing one variable rescales the
whole app. Do not hard-code a `border-radius`.

There is one shadow, `--shadow-xs`. The workbench separates surfaces with
borders and background steps, not elevation.

---

## Components

shadcn/ui, style **`radix-vega`**, base color `neutral`, [lucide](https://lucide.dev)
icons. The generated primitives live in `components/ui/`.

- **Extend `components/ui/` through the shadcn CLI or its MCP server**, not by
  hand — the files are generated, and hand-edits are lost on regeneration. The
  shadcn MCP server is wired up for Claude Code in [`.mcp.json`](../.mcp.json)
  and for VS Code in [`.vscode/mcp.json`](../.vscode/mcp.json).
- **The `shadcn` skill lives in [`.claude/skills/shadcn/`](../.claude/skills/shadcn),
  pinned by [`skills-lock.json`](../skills-lock.json)** and installed with
  `npx skills add shadcn/ui -s shadcn --copy`. It carries the CLI reference,
  registry docs, and theming rules. Its styling rules agree with this guide —
  semantic tokens, no manual `dark:` overrides, `cn()` for conditionals — but
  **where they diverge, this document wins.** The known divergence is its chat
  rule, which says to compose threads from the registry's `message-scroller`,
  `bubble`, and `attachment` primitives. We do not: `components/chat/` is our
  published npm surface, and adopting those would change the library's public
  API and add registry dependencies for every consumer.
- Compose primitives in `components/`; do not wrap Radix directly. If a
  primitive is missing, add it via shadcn first.
- A2A-specific rendering (message bubbles, artifacts, tool calls, the event
  explorer) belongs in `components/chat/` — that directory is also published to
  npm, so it must not reach into dashboard-only state.
- Reuse before adding. The bar for a new component is the same as for any other
  abstraction: the pattern has repeated three times.

---

## Typography

Two fonts, loaded through `next/font/google` in
[`app/layout.tsx`](../app/layout.tsx) and exposed as CSS variables:

- **Manrope** — `--font-manrope` → `font-sans`, the default on `html`.
- **JetBrains Mono** — `--font-jetbrains-mono` → `font-mono`.

Use `font-mono` for anything the user might copy into a terminal or a request:
IDs, URLs, JSON, headers, task states. It is a semantic signal that the string
is data, not prose.

---

## Dark mode

`components/theme-provider.tsx` toggles a `.dark` class on `<html>`, backed by
the `theme` key in `localStorage` with a `system` default that follows
`prefers-color-scheme` live.

**Every new surface must be checked in both themes.** The failure modes are
predictable: a hard-coded color, a `bg-white`, an opacity-based border that
vanishes on dark, or an image without a transparent background. Dark borders are
alpha-based (`oklch(1 0 0 / 9%)`), so a dark surface that sets its own opaque
border will look heavier than everything around it.

---

## Motion and touch

`app/globals.css` already honors `prefers-reduced-motion` globally by collapsing
animations and transitions — do not re-add motion that ignores it.

Under `@media (pointer: coarse)`, sidebar menu buttons get a 44px minimum
height. That rule is currently scoped to one selector — when you add a control
that has to be tappable on a phone, extend the same media block rather than
sprinkling `min-h-11` at call sites.

---

## Checklist for a new surface

- [ ] Semantic tokens only — no raw Tailwind colors, no hard-coded radii
- [ ] Verified in both light and dark
- [ ] Keyboard operable with a visible focus ring
- [ ] Hover-revealed controls also appear on `focus-visible`
- [ ] `aria-label` on every icon-only button
- [ ] Mono for copyable data, sans for prose
- [ ] Raw protocol data still reachable from the surface
- [ ] Covered in [`tests/accessibility/accessibility.test.tsx`](../tests/accessibility/accessibility.test.tsx)
