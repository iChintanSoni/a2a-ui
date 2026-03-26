import { useState, useRef, type KeyboardEvent } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="border-t bg-background px-4 py-3">
      <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Message agent… (Enter to send, Shift+Enter for newline)"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
        />
        <Button
          size="icon"
          className="size-8 shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
