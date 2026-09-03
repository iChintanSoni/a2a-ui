import { Buffer as BufferPolyfill } from "buffer";

// @a2a-js/sdk v1 encodes and decodes file parts through `globalThis.Buffer`
// (`Part.fromJSON` on `raw` content, and the base64 helpers on the way out).
// Next.js does not provide Buffer in the browser bundle, so without this every
// file attachment — sent or received — throws "Buffer is not defined".
export function installBufferPolyfill(): void {
  if (typeof globalThis.Buffer === "undefined") {
    (globalThis as { Buffer?: typeof BufferPolyfill }).Buffer = BufferPolyfill;
  }
}

installBufferPolyfill();
