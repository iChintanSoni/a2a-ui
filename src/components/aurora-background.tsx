/**
 * AuroraBackground — the ambient "Cool Borealis" glow layer.
 *
 * Rendered once near the top of the tree (see main.tsx). It sits at `-z-10`,
 * which paints above the opaque body base color but behind all app content,
 * so translucent `.glass*` surfaces let the drifting cyan/indigo/violet glow
 * show through. Motion is opt-in via `prefers-reduced-motion` (handled in
 * index.css); the blobs are GPU-composited (transform-only animation).
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="aurora-blob aurora-blob-1 -top-[15%] -left-[10%] size-[55vmax]"
        style={{
          background:
            "radial-gradient(circle at center, var(--aurora-cyan), transparent 68%)",
        }}
      />
      <div
        className="aurora-blob aurora-blob-2 top-[8%] -right-[15%] size-[60vmax]"
        style={{
          background:
            "radial-gradient(circle at center, var(--aurora-violet), transparent 68%)",
        }}
      />
      <div
        className="aurora-blob aurora-blob-3 -bottom-[20%] left-[18%] size-[50vmax]"
        style={{
          background:
            "radial-gradient(circle at center, var(--aurora-indigo), transparent 68%)",
        }}
      />
    </div>
  );
}
