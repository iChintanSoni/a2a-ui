import type { FilePart, Message, Part } from "@a2a-js/sdk";
import { getTextPartsText } from "@/lib/a2a/parts";
import type {
  A2AContextConfig,
  A2AMessageContextInput,
  OutgoingMessagePartInput,
} from "@/lib/a2a/types";

interface BuildOutgoingMessageInput {
  parts: Part[];
  messageId: string;
  contextId: string;
  agentUrl: string;
  metadata?: Record<string, string>;
  inputTaskId?: string;
  context?: A2AContextConfig;
}

function buildHiddenContextEnvelope(hiddenSystemContext?: string): string | null {
  const trimmed = hiddenSystemContext?.trim();
  if (!trimmed) return null;
  return `<system_context hidden="true">\n${trimmed}\n</system_context>`;
}

export async function resolveContextConfig(
  input: A2AMessageContextInput,
  config?: A2AContextConfig,
): Promise<{ metadata?: Record<string, string>; hiddenSystemContext?: string }> {
  const mergedMetadata: Record<string, string> = {
    ...(config?.initialMetadata ?? {}),
  };
  const hiddenContextParts: string[] = [];

  if (config?.hiddenSystemContext?.trim()) {
    hiddenContextParts.push(config.hiddenSystemContext.trim());
  }

  for (const enricher of config?.messageContextEnrichers ?? []) {
    const result = await enricher(input);
    if (result.metadata) {
      Object.assign(mergedMetadata, result.metadata);
    }
    if (result.hiddenSystemContext?.trim()) {
      hiddenContextParts.push(result.hiddenSystemContext.trim());
    }
  }

  if (input.metadata) {
    Object.assign(mergedMetadata, input.metadata);
  }

  return {
    metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined,
    hiddenSystemContext:
      hiddenContextParts.length > 0 ? hiddenContextParts.join("\n\n") : undefined,
  };
}

export async function encodeAttachments(files: File[]): Promise<FilePart[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<FilePart>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            resolve({
              kind: "file",
              file: { name: file.name, mimeType: file.type, bytes: base64 },
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

function injectHiddenContext(parts: Part[], hiddenSystemContext?: string): Part[] {
  const hiddenEnvelope = buildHiddenContextEnvelope(hiddenSystemContext);
  if (!hiddenEnvelope) return parts;

  let injected = false;
  const nextParts = parts.map((part) => {
    if (injected || part.kind !== "text") return part;
    injected = true;
    return {
      ...part,
      text: part.text ? `${hiddenEnvelope}\n\n${part.text}` : hiddenEnvelope,
    };
  });

  if (injected) return nextParts;
  return [{ kind: "text", text: hiddenEnvelope }, ...parts];
}

function isNativeFile(part: OutgoingMessagePartInput): part is File {
  return typeof File !== "undefined" && part instanceof File;
}

export async function normalizeOutgoingParts(
  parts: OutgoingMessagePartInput[],
): Promise<Part[]> {
  const normalized: Part[] = [];

  for (const part of parts) {
    if (isNativeFile(part)) {
      const [filePart] = await encodeAttachments([part]);
      normalized.push(filePart);
      continue;
    }

    normalized.push(part);
  }

  return normalized;
}

export async function buildOutgoingMessage(
  input: BuildOutgoingMessageInput,
): Promise<Message> {
  const text = getTextPartsText(input.parts);
  const resolvedContext = await resolveContextConfig(
    {
      text,
      parts: input.parts,
      contextId: input.contextId,
      agentUrl: input.agentUrl,
      metadata: input.metadata,
    },
    input.context,
  );

  const parts = injectHiddenContext(input.parts, resolvedContext.hiddenSystemContext);

  return {
    kind: "message",
    messageId: input.messageId,
    role: "user",
    contextId: input.contextId,
    ...(input.inputTaskId ? { taskId: input.inputTaskId } : {}),
    ...(resolvedContext.metadata ? { metadata: resolvedContext.metadata } : {}),
    parts,
  };
}
