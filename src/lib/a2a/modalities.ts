import { normalizeMode } from "@/lib/utils/modes";

export type ModalityFamily = "text" | "data" | "image" | "audio" | "video" | "file";

export interface ModalitySummary {
  text: boolean;
  data: boolean;
  image: boolean;
  audio: boolean;
  video: boolean;
  file: boolean;
}

function normalizeMimeType(value: string): string {
  return normalizeMode(value).toLowerCase();
}

export function modalityFamily(mode: string): ModalityFamily {
  const normalized = normalizeMimeType(mode);
  if (normalized === "application/json" || normalized.endsWith("+json")) return "data";
  if (normalized === "text/plain" || normalized.startsWith("text/")) return "text";
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("video/")) return "video";
  return "file";
}

export function summarizeModalities(modes: string[] = []): ModalitySummary {
  const summary: ModalitySummary = {
    text: false,
    data: false,
    image: false,
    audio: false,
    video: false,
    file: false,
  };

  for (const mode of modes) {
    summary[modalityFamily(mode)] = true;
  }

  return summary;
}

export function supportsAudioInput(modes: string[] = []): boolean {
  return modes.some((mode) => modalityFamily(mode) === "audio");
}

export function preferredAudioMimeType(modes: string[] = []): string {
  const supported =
    typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function";
  const declared = modes
    .map(normalizeMimeType)
    .filter((mode) => mode.startsWith("audio/") && !mode.endsWith("/*"));
  const candidates = [...declared, "audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

  return candidates.find((mimeType) => !supported || MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

export function extensionForMimeType(mimeType: string): string {
  const normalized = mimeType.split(";")[0].toLowerCase();
  if (normalized === "audio/mpeg") return "mp3";
  if (normalized === "audio/mp4") return "m4a";
  if (normalized === "audio/ogg") return "ogg";
  if (normalized === "audio/wav" || normalized === "audio/x-wav") return "wav";
  if (normalized === "audio/webm") return "webm";
  return normalized.split("/")[1] || "audio";
}
