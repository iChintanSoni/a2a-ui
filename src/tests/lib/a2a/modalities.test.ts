import { describe, expect, it, vi } from "vitest";
import {
  extensionForMimeType,
  modalityFamily,
  preferredAudioMimeType,
  summarizeModalities,
  supportsAudioInput,
} from "@/lib/a2a/modalities";

describe("modality helpers", () => {
  it("maps declared modes into modality families", () => {
    expect(modalityFamily("text")).toBe("text");
    expect(modalityFamily("application/json")).toBe("data");
    expect(modalityFamily("image/*")).toBe("image");
    expect(modalityFamily("audio/webm")).toBe("audio");
    expect(modalityFamily("video/mp4")).toBe("video");
  });

  it("summarizes rich input and output modes", () => {
    expect(summarizeModalities(["text/plain", "audio/*", "application/vnd.a2ui+json"])).toEqual({
      text: true,
      data: true,
      image: false,
      audio: true,
      video: false,
      file: false,
    });
    expect(supportsAudioInput(["text/plain", "audio/*"])).toBe(true);
  });

  it("prefers declared supported audio MIME types", () => {
    const original = globalThis.MediaRecorder;
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (mimeType: string) => mimeType === "audio/webm",
    });

    expect(preferredAudioMimeType(["audio/mp4", "audio/webm"])).toBe("audio/webm");
    expect(extensionForMimeType("audio/webm;codecs=opus")).toBe("webm");

    vi.stubGlobal("MediaRecorder", original);
  });
});
