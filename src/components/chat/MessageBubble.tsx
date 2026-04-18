import { memo, useState } from "react";
import { Bot, Check, Copy, FileImage, FileText, Paperclip, User2 } from "lucide-react";
import MathRenderer from "@/components/MathRenderer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ChatAttachment, ChatMessage } from "@/components/chat/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

const formatFileSize = (size = 0) => {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 104857.6) / 10} MB`;
};

const AttachmentPreview = ({ attachment }: { attachment: ChatAttachment }) => {
  const isImage = attachment.kind === "image" && attachment.previewUrl;

  return (
    <div className="rounded-2xl border border-border bg-muted/60 p-3">
      {isImage ? (
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="mb-3 h-36 w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-background text-primary">
          {attachment.kind === "image" ? (
            <FileImage className="h-4 w-4" />
          ) : attachment.kind === "pdf" ? (
            <FileText className="h-4 w-4" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-foreground">{attachment.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {attachment.kind} {formatFileSize(attachment.size)}
          </div>
          {attachment.extractedText ? (
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{attachment.extractedText}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";
  const attachments = message.attachments || [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Response copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className={cn("flex w-full", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "group min-w-0 rounded-[1.75rem] border px-4 py-3 sm:px-5",
          isAssistant
            ? "max-w-[85%] border-border bg-card text-foreground shadow-sm md:max-w-[65%]"
            : "max-w-[85%] border-primary/20 bg-accent/70 text-foreground md:max-w-[65%]",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-2xl",
                isAssistant ? "bg-accent text-primary" : "bg-background text-foreground",
              )}
            >
              {isAssistant ? <Bot className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
            </div>
            <div>
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.22em]",
                  isAssistant ? "text-primary" : "text-foreground/60",
                )}
              >
                {isAssistant ? "VidyaSaathi" : "You"}
              </div>
              {message.createdAt ? (
                <div className="text-[11px] text-muted-foreground/80">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              ) : null}
            </div>
          </div>

          {isAssistant ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex h-9 items-center gap-2 rounded-2xl border border-transparent px-3 text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>

        {attachments.length > 0 ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        ) : null}

        <div className={cn(isAssistant ? "max-h-[300px] overflow-y-auto pr-1" : undefined)}>
          {isAssistant ? (
            <MathRenderer content={message.content} className="text-sm text-current" />
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
