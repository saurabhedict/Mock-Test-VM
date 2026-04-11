import type { RefObject } from "react";
import { Loader2 } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/components/chat/types";

interface ChatContainerProps {
  messages: ChatMessage[];
  suggestedPrompts: string[];
  submitting?: boolean;
  showJumpToLatest?: boolean;
  viewportRef: RefObject<HTMLDivElement>;
  onPromptClick: (prompt: string) => void;
  onScroll: () => void;
  onJumpToLatest: () => void;
}

export default function ChatContainer({
  messages,
  suggestedPrompts,
  submitting = false,
  showJumpToLatest = false,
  viewportRef,
  onPromptClick,
  onScroll,
  onJumpToLatest,
}: ChatContainerProps) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-[#EAE4DE] bg-[#FAF5F0]">
      <div
        ref={viewportRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto px-4 py-5 sm:px-5 lg:px-6"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          {messages.length === 0 && !submitting ? (
            <div className="space-y-4">
              <MessageBubble
                message={{
                  id: "greeting",
                  role: "assistant",
                  content: "Hello! I am VidyaSaathi. How can I help you with your practice test today?",
                  createdAt: new Date().toISOString(),
                }}
              />
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onPromptClick(prompt)}
                    className="rounded-full border border-[#EAE4DE] bg-white px-4 py-2 text-xs text-[#231C17]/75 shadow-sm transition hover:border-[#E8722A]/25 hover:bg-[#FFF0E5] hover:text-[#E8722A]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {submitting ? (
            <div className="flex justify-start">
              <div className="max-w-[22rem] rounded-[1.75rem] border border-[#EAE4DE] bg-white px-5 py-4 text-sm text-[#231C17]/70 shadow-sm">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8722A]">VidyaSaathi</div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#E8722A]" />
                  Thinking...
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showJumpToLatest ? (
        <div className="pointer-events-none absolute bottom-5 right-5">
          <Button
            type="button"
            onClick={onJumpToLatest}
            className="pointer-events-auto h-10 rounded-full border border-[#EAE4DE] bg-white px-4 text-[#231C17] shadow-sm hover:bg-[#FFF0E5] hover:text-[#E8722A]"
          >
            Jump to latest
          </Button>
        </div>
      ) : null}
    </div>
  );
}
