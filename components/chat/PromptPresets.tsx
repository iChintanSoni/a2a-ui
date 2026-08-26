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
      {presets.slice(0, 6).map(preset => (
        <button
          key={preset.id}
          onClick={() => onApply(preset)}
          disabled={disabled}
          className="bg-muted/40 text-muted-foreground hover:text-foreground rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
          title={preset.text}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
