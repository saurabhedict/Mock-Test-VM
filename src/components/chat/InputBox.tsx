import { useEffect, useRef } from "react";
import { Loader2, Mic, Paperclip, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/components/chat/types";

interface InputBoxProps {
  value: string;
  attachments: ChatAttachment[];
  disabled?: boolean;
  listening?: boolean;
  interimTranscript?: string;
  voiceSupported?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachFiles: (files: FileList) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onToggleVoice: () => void;
}

export default function InputBox({
  value,
  attachments,
  disabled = false,
  listening = false,
  interimTranscript = "",
  voiceSupported = false,
  onChange,
  onSend,
  onAttachFiles,
  onRemoveAttachment,
  onToggleVoice,
}: InputBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [value]);

  const canSend = Boolean(value.trim() || attachments.length > 0) && !disabled;

  return (
    <div className="sticky bottom-0 z-10 rounded-[1.9rem] border border-[#EAE4DE] bg-white/95 p-3 shadow-sm backdrop-blur">
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#EAE4DE] bg-[#FAF5F0] px-3 py-2 text-xs text-[#231C17]"
            >
              <span className="truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                className="rounded-full p-1 text-[#7A716A] transition hover:bg-white hover:text-[#231C17]"
                aria-label={`Remove ${attachment.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <div className="flex items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] text-[#7A716A] transition hover:border-[#E8722A]/20 hover:bg-[#FFF0E5] hover:text-[#E8722A]"
            aria-label="Attach file"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>

          <button
            type="button"
            onClick={onToggleVoice}
            disabled={disabled || !voiceSupported}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border transition",
              voiceSupported
                ? listening
                  ? "border-[#E8722A]/30 bg-[#FFF0E5] text-[#E8722A]"
                  : "border-[#EAE4DE] bg-[#FAF5F0] text-[#7A716A] hover:border-[#E8722A]/20 hover:bg-[#FFF0E5] hover:text-[#E8722A]"
                : "cursor-not-allowed border-[#EAE4DE] bg-[#F3EDE7] text-[#B5ACA5]",
            )}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4.5 w-4.5" />}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder="Message VidyaSaathi..."
            disabled={disabled}
            className="min-h-[56px] max-h-[120px] w-full resize-none rounded-[1.5rem] border-[#EAE4DE] bg-[#FAF5F0] px-4 py-3 text-sm leading-7 text-[#231C17] placeholder:text-[#7A716A]/60 focus-visible:ring-[#E8722A]/25"
            rows={1}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#7A716A]/70">
            <span>Enter to send, Shift+Enter for a new line</span>
            <span>
              {listening
                ? `Listening${interimTranscript ? `: ${interimTranscript}` : "..."}`
                : "PDF, images, and text files supported"}
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="h-14 rounded-[1.5rem] px-5 text-white hover:brightness-110"
          style={{ background: "linear-gradient(135deg, #E8722A, #D4621E)", boxShadow: "0 2px 20px -4px rgba(232,114,42,0.3)" }}
        >
          {disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.html,.css,.xml,.yaml,.yml,text/*"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            onAttachFiles(event.target.files);
          }

          event.target.value = "";
        }}
      />
    </div>
  );
}
