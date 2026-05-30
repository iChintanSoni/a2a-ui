import * as React from "react";

// Module-level ref count so stacked modals lock/unlock the body exactly once.
let lockCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

function lock() {
  if (lockCount === 0) {
    const body = document.body;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    originalOverflow = body.style.overflow;
    originalPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    // Compensate for the removed scrollbar to avoid a layout shift.
    if (scrollbarWidth > 0) {
      const currentPad =
        parseInt(window.getComputedStyle(body).paddingRight, 10) || 0;
      body.style.paddingRight = `${currentPad + scrollbarWidth}px`;
    }
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}

/** Lock body scroll while `enabled` is true. Ref-counted across instances. */
export function useScrollLock(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    lock();
    return unlock;
  }, [enabled]);
}
