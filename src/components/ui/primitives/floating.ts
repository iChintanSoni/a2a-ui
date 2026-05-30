import * as React from "react";

export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";
export type Placement = Side | `${Side}-${Align}`;

export interface UseFloatingOptions {
  open: boolean;
  placement?: Placement;
  /** Gap between the reference and the floating element, in px. */
  offset?: number;
  /** Flip to the opposite side when the preferred side lacks room. */
  flip?: boolean;
  /** Slide along the cross axis to stay within the viewport. */
  shift?: boolean;
  /** Match the floating element's width to the reference (select menus). */
  matchWidth?: boolean;
  /** Share a trigger ref owned elsewhere (Root/Trigger/Content split). */
  referenceRef?: React.RefObject<HTMLElement | null>;
}

interface FloatingData {
  x: number;
  y: number;
  side: Side;
  align: Align;
  transformOrigin: string;
  availableWidth: number;
  availableHeight: number;
  referenceWidth: number;
  referenceHeight: number;
  isPositioned: boolean;
}

const VIEWPORT_MARGIN = 8;

function parsePlacement(placement: Placement): [Side, Align] {
  const [side, align = "center"] = placement.split("-") as [Side, Align];
  return [side, align];
}

function originFor(side: Side, align: Align): string {
  const cross =
    align === "start" ? "left" : align === "end" ? "right" : "center";
  const crossV =
    align === "start" ? "top" : align === "end" ? "bottom" : "center";
  if (side === "top") return `bottom ${cross}`;
  if (side === "bottom") return `top ${cross}`;
  if (side === "left") return `${crossV} right`;
  return `${crossV} left`;
}

function compute(
  reference: HTMLElement,
  floating: HTMLElement,
  opts: Required<Pick<UseFloatingOptions, "placement" | "offset" | "flip" | "shift">>,
): FloatingData {
  const r = reference.getBoundingClientRect();
  const f = floating.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const off = opts.offset;
  const [initialSide, align] = parsePlacement(opts.placement);
  let side = initialSide;

  // Flip to the opposite side if the preferred side overflows and the
  // opposite side has room.
  if (opts.flip) {
    if (side === "bottom" && r.bottom + off + f.height > vh && r.top - off - f.height >= 0)
      side = "top";
    else if (side === "top" && r.top - off - f.height < 0 && r.bottom + off + f.height <= vh)
      side = "bottom";
    else if (side === "right" && r.right + off + f.width > vw && r.left - off - f.width >= 0)
      side = "left";
    else if (side === "left" && r.left - off - f.width < 0 && r.right + off + f.width <= vw)
      side = "right";
  }

  let x = 0;
  let y = 0;
  if (side === "bottom") y = r.bottom + off;
  else if (side === "top") y = r.top - off - f.height;
  else if (side === "right") x = r.right + off;
  else x = r.left - off - f.width;

  // Cross-axis alignment.
  if (side === "top" || side === "bottom") {
    if (align === "start") x = r.left;
    else if (align === "end") x = r.right - f.width;
    else x = r.left + r.width / 2 - f.width / 2;
  } else {
    if (align === "start") y = r.top;
    else if (align === "end") y = r.bottom - f.height;
    else y = r.top + r.height / 2 - f.height / 2;
  }

  // Shift back inside the viewport on the cross axis.
  if (opts.shift) {
    if (side === "top" || side === "bottom") {
      x = Math.max(VIEWPORT_MARGIN, Math.min(x, vw - f.width - VIEWPORT_MARGIN));
    } else {
      y = Math.max(VIEWPORT_MARGIN, Math.min(y, vh - f.height - VIEWPORT_MARGIN));
    }
  }

  // Space available on the chosen side (drives max-height/width of menus).
  let availableHeight = vh - 2 * VIEWPORT_MARGIN;
  let availableWidth = vw - 2 * VIEWPORT_MARGIN;
  if (side === "bottom") availableHeight = vh - (r.bottom + off) - VIEWPORT_MARGIN;
  else if (side === "top") availableHeight = r.top - off - VIEWPORT_MARGIN;
  else if (side === "right") availableWidth = vw - (r.right + off) - VIEWPORT_MARGIN;
  else if (side === "left") availableWidth = r.left - off - VIEWPORT_MARGIN;

  return {
    x: Math.round(x),
    y: Math.round(y),
    side,
    align,
    transformOrigin: originFor(side, align),
    availableWidth: Math.max(0, Math.floor(availableWidth)),
    availableHeight: Math.max(0, Math.floor(availableHeight)),
    referenceWidth: r.width,
    referenceHeight: r.height,
    isPositioned: true,
  };
}

/**
 * Hand-rolled floating positioning (no dependency). Computes an absolute
 * viewport position for `floatingRef` relative to `referenceRef` with
 * offset / flip / shift, recomputes on scroll + resize, and exposes the
 * placement plus `--float-*` CSS vars consumed by tooltip/menu/select classes.
 */
export function useFloating(options: UseFloatingOptions) {
  const {
    open,
    placement = "bottom",
    offset = 6,
    flip = true,
    shift = true,
    matchWidth = false,
    referenceRef: externalReferenceRef,
  } = options;

  const internalReferenceRef = React.useRef<HTMLElement | null>(null);
  const referenceRef = externalReferenceRef ?? internalReferenceRef;
  const floatingRef = React.useRef<HTMLElement | null>(null);
  const [initialSide, initialAlign] = parsePlacement(placement);
  const [data, setData] = React.useState<FloatingData>({
    x: 0,
    y: 0,
    side: initialSide,
    align: initialAlign,
    transformOrigin: "center",
    availableWidth: 0,
    availableHeight: 0,
    referenceWidth: 0,
    referenceHeight: 0,
    isPositioned: false,
  });

  const update = React.useCallback(() => {
    const reference = referenceRef.current;
    const floating = floatingRef.current;
    if (!reference || !floating) return;
    setData(compute(reference, floating, { placement, offset, flip, shift }));
  }, [placement, offset, flip, shift, referenceRef]);

  React.useLayoutEffect(() => {
    if (!open) {
      // Reset so the next open starts hidden (avoids a stale-position flash).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData((d) => (d.isPositioned ? { ...d, isPositioned: false } : d));
      return;
    }
    let raf = 0;
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    onChange(); // initial positioning, deferred to the next frame
    // Capture-phase scroll catches scrolling of any ancestor.
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    const ro = new ResizeObserver(onChange);
    if (referenceRef.current) ro.observe(referenceRef.current);
    if (floatingRef.current) ro.observe(floatingRef.current);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
      ro.disconnect();
    };
  }, [open, update, referenceRef]);

  const floatingStyles = React.useMemo<React.CSSProperties>(
    () => ({
      position: "fixed",
      top: 0,
      left: 0,
      transform: `translate3d(${data.x}px, ${data.y}px, 0)`,
      transformOrigin: data.transformOrigin,
      visibility: data.isPositioned ? "visible" : "hidden",
      "--float-transform-origin": data.transformOrigin,
      "--float-available-width": `${data.availableWidth}px`,
      "--float-available-height": `${data.availableHeight}px`,
      "--float-trigger-width": `${data.referenceWidth}px`,
      "--float-trigger-height": `${data.referenceHeight}px`,
      ...(matchWidth ? { width: data.referenceWidth } : null),
    }) as React.CSSProperties,
    [data, matchWidth],
  );

  return {
    referenceRef,
    floatingRef,
    floatingStyles,
    side: data.side,
    align: data.align,
    isPositioned: data.isPositioned,
    update,
  };
}
