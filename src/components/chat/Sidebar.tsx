import { formatDistanceToNow } from "date-fns";
import { History, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSessionSummary } from "@/components/chat/types";

interface SidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string;
  loading?: boolean;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
}

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return formatDistanceToNow(date, { addSuffix: true });
};

export default function Sidebar({
  sessions,
  activeSessionId,
  loading = false,
  onNewChat,
  onSelectSession,
}: SidebarProps) {
  return (
    <aside
      className="min-w-0 rounded-3xl border border-[#EAE4DE] bg-white/90 p-4 shadow-sm"
      style={{ boxShadow: "0 4px 24px -6px rgba(30,20,12,0.08)" }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A716A]/60">History</div>
          <h3 className="mt-2 text-lg font-display font-semibold text-[#231C17]">Previous chats</h3>
        </div>

        <Button
          type="button"
          onClick={onNewChat}
          className="h-11 rounded-2xl px-4 text-white hover:brightness-110"
          style={{ background: "linear-gradient(135deg, #E8722A, #D4621E)" }}
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] px-3 py-2 text-xs text-[#7A716A]">
        <History className="h-4 w-4 text-[#E8722A]" />
        Click any previous thread to continue where you left off.
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 lg:max-h-[43rem] lg:flex-col lg:overflow-y-auto lg:pb-0">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="min-w-[16rem] rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] p-4 lg:min-w-0"
            >
              <div className="h-3 w-24 rounded-full bg-[#EAE4DE]" />
              <div className="mt-3 h-3 w-full rounded-full bg-[#F3EDE7]" />
              <div className="mt-2 h-3 w-20 rounded-full bg-[#F3EDE7]" />
            </div>
          ))
        ) : sessions.length > 0 ? (
          sessions.map((session) => {
            const isActive = session.sessionId === activeSessionId;

            return (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => onSelectSession(session.sessionId)}
                className={cn(
                  "flex w-full min-w-[16rem] items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all lg:min-w-0",
                  isActive
                    ? "border-[#E8722A]/30 bg-[#FFF0E5]"
                    : "border-[#EAE4DE] bg-[#FAF5F0] hover:border-[#E8722A]/20 hover:bg-white",
                )}
              >
                <div className="min-w-0 flex-1 pr-2 text-sm font-medium text-[#231C17] block truncate">
                  {session.title || "Untitled chat"}
                </div>
                <div className="shrink-0 text-[10px] uppercase text-[#7A716A]/55">
                  {formatUpdatedAt(session.updatedAt)}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[#EAE4DE] bg-[#FAF5F0] p-4 text-xs leading-5 text-[#7A716A]">
            Your chat history will appear here once you start asking questions.
          </div>
        )}
      </div>
    </aside>
  );
}
