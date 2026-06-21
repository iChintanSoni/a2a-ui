import type { PromptPreset } from "@/lib/features/workbench/workbenchSlice";

interface Props {
  presets: PromptPreset[];
  disabled?: boolean;
  onApply: (preset: PromptPreset) => void;
}

export function PromptPresets({ presets, disabled, onApply }: Props) {
  if (presets.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.slice(0, 6).map((preset) => (
        <button
          key={preset.id}
          onClick={() => onApply(preset)}
          disabled={disabled}
          className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          title={preset.text}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
