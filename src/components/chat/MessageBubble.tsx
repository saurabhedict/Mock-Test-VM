import { useState } from "react";
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
    <div className="rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] p-3">
      {isImage ? (
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="mb-3 h-36 w-full rounded-2xl border border-[#EAE4DE] object-cover"
        />
      ) : null}

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#E8722A]">
          {attachment.kind === "image" ? (
            <FileImage className="h-4 w-4" />
          ) : attachment.kind === "pdf" ? (
            <FileText className="h-4 w-4" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-[#231C17]">{attachment.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#7A716A]/60">
            {attachment.kind} {formatFileSize(attachment.size)}
          </div>
          {attachment.extractedText ? (
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#7A716A]">{attachment.extractedText}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default function MessageBubble({ message }: MessageBubbleProps) {
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
          "group max-w-[min(78%,48rem)] min-w-0 rounded-[1.75rem] border px-4 py-3 sm:px-5",
          isAssistant
            ? "border-[#EAE4DE] bg-white text-[#231C17] shadow-sm"
            : "border-[#E8722A]/20 bg-[#FFF0E5] text-[#231C17]",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-2xl",
                isAssistant ? "bg-[#FFF0E5] text-[#E8722A]" : "bg-white text-[#231C17]",
              )}
            >
              {isAssistant ? <Bot className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
            </div>
            <div>
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.22em]",
                  isAssistant ? "text-[#E8722A]" : "text-[#231C17]/45",
                )}
              >
                {isAssistant ? "VidyaSaathi" : "You"}
              </div>
              {message.createdAt ? (
                <div className="text-[11px] text-[#7A716A]/70">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              ) : null}
            </div>
          </div>

          {isAssistant ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex h-9 items-center gap-2 rounded-2xl border border-transparent px-3 text-xs font-medium text-[#7A716A] transition hover:border-[#EAE4DE] hover:bg-[#FAF5F0] hover:text-[#231C17]"
            >
              {copied ? <Check className="h-4 w-4 text-[#E8722A]" /> : <Copy className="h-4 w-4" />}
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

        {isAssistant ? (
          <MathRenderer content={message.content} className="text-sm text-current" />
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</div>
        )}
      </div>
    </div>
  );
}
