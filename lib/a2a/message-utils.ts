import type { FilePart, Message, Part } from "@a2a-js/sdk";
import type { A2AContextConfig, A2AMessageContextInput } from "@/lib/a2a/types";

interface BuildOutgoingMessageInput {
  text: string;
  messageId: string;
  contextId: string;
  agentUrl: string;
  metadata?: Record<string, string>;
  fileParts?: FilePart[];
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

export async function buildOutgoingMessage(
  input: BuildOutgoingMessageInput,
): Promise<Message> {
  const resolvedContext = await resolveContextConfig(
    {
      text: input.text,
      contextId: input.contextId,
      agentUrl: input.agentUrl,
      metadata: input.metadata,
    },
    input.context,
  );

  const hiddenEnvelope = buildHiddenContextEnvelope(resolvedContext.hiddenSystemContext);
  const parts: Part[] = [
    {
      kind: "text",
      text: hiddenEnvelope ? `${hiddenEnvelope}\n\n${input.text}` : input.text,
    },
    ...((input.fileParts ?? []).map((filePart) => ({
      kind: "file" as const,
      file: filePart.file as import("@a2a-js/sdk").FilePart["file"],
    })) satisfies Part[]),
  ];

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
