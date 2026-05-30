import * as React from "react";
import { createPortal } from "react-dom";

const PORTAL_ID = "aurora-portal";

/** Lazily create (once) a singleton portal root on <body>. */
function getPortalRoot(): HTMLElement {
  let el = document.getElementById(PORTAL_ID);
  if (!el) {
    el = document.createElement("div");
    el.setAttribute("id", PORTAL_ID);
    document.body.appendChild(el);
  }
  return el;
}

export interface PortalProps {
  children: React.ReactNode;
  /** Override the default singleton portal root. */
  container?: HTMLElement | null;
}

/**
 * Renders children into a single shared portal root on <body>. One root keeps
 * z-index predictable and prevents popovers/dialogs from being clipped by
 * `overflow:hidden` / transformed ancestors, and keeps backdrop-filter
 * stacking clean (overlays sit outside panel blur contexts).
 */
export function Portal({ children, container }: PortalProps) {
  // The app is client-rendered, so the portal root exists at first render.
  const [root] = React.useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (container ?? getPortalRoot()),
  );

  if (!root) return null;
  return createPortal(children, root);
}
