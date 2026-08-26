# Accessibility Guide

This document summarizes the accessibility (a11y) standards, keyboard navigation capabilities, screen-reader optimizations, and contributor verification procedures in **a2a-ui**.

---

## 1. Accessibility Principles

a2a-ui is built to adhere to [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/) guidelines:

1. **Keyboard Operability**: Every interactive element (navigation links, buttons, dialogs, dropdowns, filters, and code inspectors) must be operable without a mouse.
2. **Focus Visibility**: All interactive elements maintain visible, distinct focus outlines (`focus-visible:ring-*`).
3. **Screen Reader Landmarks & Semantics**: Pages include skip navigation links, semantic `<main>` landmarks, descriptive `aria-label` / `aria-labelledby` attributes, and `aria-expanded` / `aria-pressed` states.
4. **Live Regions & Status Announcements**: Dynamic updates (such as agent connection diagnostics, streaming task states, and copy-to-clipboard confirmations) provide screen reader announcements using `aria-live="polite"` and `role="status"`.

---

## 2. Keyboard Navigation Reference

| Action / Component             | Shortcut / Key                                      | Behavior                                                                                                    |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Skip Navigation**            | `Tab` (at page top)                                 | Reveals "Skip to main content" link and jumps directly to `<main id="main-content">`.                       |
| **Global Navigation**          | `Tab` / `Shift+Tab`                                 | Traverses the sidebar items, top-bar actions, and main content in a logical tab sequence.                   |
| **Chat Composer**              | `Enter`                                             | Sends message when valid.                                                                                   |
| **Chat Composer**              | `Shift + Enter`                                     | Inserts newline without sending.                                                                            |
| **Debug Console Resizer**      | `Tab` into drag separator + `ArrowUp` / `ArrowDown` | Resizes the debug console height incrementally (160px – 600px).                                             |
| **Toolbars & Filter Buttons**  | `Tab` + `Space` / `Enter`                           | Toggles filter modes (`aria-pressed="true                                                                   | false"`). |
| **Action Overlays in Bubbles** | `Tab`                                               | Rerun prompt (`RotateCcw`) and Inspect JSON (`{}`) buttons appear on keyboard focus (`focus-visible:flex`). |
| **Modals & Dialogs**           | `Escape`                                            | Closes dialog and restores focus to trigger.                                                                |
| **Collapsibles & Accordions**  | `Enter` / `Space`                                   | Expands or collapses item with `aria-expanded` announcement.                                                |

---

## 3. Screen Reader Optimizations

- **Icon Buttons**: All icon-only buttons (such as trash, copy, clone, inspect, close, and favorite) include explicit, descriptive `aria-label` attributes.
- **Form Selects**: Radix UI `SelectTrigger` components specify `aria-label` attributes describing the filter or selection field (e.g. `aria-label="Auth Type"`, `aria-label="Filter by status"`).
- **Status Badges & Progress**: Task state changes, connection checks, and execution status rows announce state updates through `role="status"` and `aria-live="polite"`. Decorative status icons carry `aria-hidden="true"`.

---

## 4. Verification Checklist for Contributors

When submitting UI changes or new components:

- [ ] **Tab Order**: Navigate the entire view using only `Tab` and `Shift+Tab`. Focus should never get trapped or lost.
- [ ] **Focus Rings**: Verify that focused elements render a high-contrast focus ring.
- [ ] **Hover/Focus Parity**: Elements revealed on mouse hover (e.g., hover action buttons) must also be revealed when focused via keyboard (`group-focus-within:flex focus-visible:flex`).
- [ ] **Form Labels**: Ensure all `<input>`, `<textarea>`, and `<select>` elements have associated `<Label htmlFor="...">` or explicit `aria-label`.
- [ ] **Automated Tests**: Run the accessibility test suite:
  ```bash
  npm test -- tests/accessibility/accessibility.test.tsx
  ```
