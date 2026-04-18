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
      className="min-w-0 rounded-3xl border border-border bg-card/90 p-4 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">History</div>
          <h3 className="mt-2 text-lg font-display font-semibold text-foreground">Previous chats</h3>
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

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <History className="h-4 w-4 text-primary" />
        Click any previous thread to continue where you left off.
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 lg:max-h-[43rem] lg:flex-col lg:overflow-y-auto lg:pb-0">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="min-w-[16rem] rounded-2xl border border-border bg-muted/60 p-4 lg:min-w-0"
            >
              <div className="h-3 w-24 rounded-full bg-border" />
              <div className="mt-3 h-3 w-full rounded-full bg-muted" />
              <div className="mt-2 h-3 w-20 rounded-full bg-muted" />
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
                    ? "border-primary/30 bg-accent/70"
                    : "border-border bg-background/60 hover:border-primary/20 hover:bg-card",
                )}
              >
                <div className="block min-w-0 flex-1 truncate pr-2 text-sm font-medium text-foreground">
                  {session.title || "Untitled chat"}
                </div>
                <div className="shrink-0 text-[10px] uppercase text-muted-foreground/60">
                  {formatUpdatedAt(session.updatedAt)}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
            Your chat history will appear here once you start asking questions.
          </div>
        )}
      </div>
    </aside>
  );
}
