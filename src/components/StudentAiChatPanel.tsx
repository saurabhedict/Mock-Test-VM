import { motion } from "framer-motion";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/services/api";
import ChatContainer from "@/components/chat/ChatContainer";
import InputBox from "@/components/chat/InputBox";
import Sidebar from "@/components/chat/Sidebar";
import { isSupportedChatAttachment, prepareChatAttachment } from "@/components/chat/chatAttachments";
import type {
  ChatAttachment,
  ChatMessage,
  ChatSessionDetail,
  ChatSessionSummary,
} from "@/components/chat/types";
import { useSpeechToText } from "@/components/chat/useSpeechToText";
import { readApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ChatQuestion = {
  question: string;
  options: Array<string | { text: string; imageUrl?: string; originalIndex?: number }>;
  explanation?: string;
  questionImage?: string;
  explanationImage?: string;
  questionType?: string;
  correctAnswer?: number;
  correctAnswers?: number[];
  writtenAnswer?: string;
  subject?: string;
};

interface StudentAiChatPanelProps {
  testTitle?: string;
  questions: ChatQuestion[];
  answers: Record<string, unknown>;
  summary: {
    score: number;
    correct: number;
    partial: number;
    wrong: number;
    unanswered: number;
    totalMarks: number;
  };
  timeTaken?: number;
  perQuestionTimes?: number[];
}

const MAX_ATTACHMENTS = 4;

const createMessageId = (role: "user" | "assistant") =>
  globalThis.crypto?.randomUUID?.() || `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toOptionLabel = (index: number) => String.fromCharCode(65 + index);

const readOptionText = (option: string | { text: string; imageUrl?: string }) =>
  typeof option === "string" ? option : option?.text || "";

const toPlainText = (value = "") => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const truncate = (value = "", limit = 180) => {
  const clean = toPlainText(value);
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trim()}...`;
};

const formatSingleAnswer = (question: ChatQuestion, answer: unknown) => {
  if (question.questionType === "written") {
    return typeof answer === "string" ? toPlainText(answer) : "";
  }

  if (question.questionType === "multiple") {
    const selected = Array.isArray(answer) ? answer.map((value) => Number(value)) : [];
    return selected.map((index) => `${toOptionLabel(index)}. ${readOptionText(question.options[index])}`).join(", ");
  }

  const index = Number(answer);
  if (!Number.isFinite(index)) return "";
  return `${toOptionLabel(index)}. ${readOptionText(question.options[index])}`;
};

const formatCorrectAnswer = (question: ChatQuestion) => {
  if (question.questionType === "written") {
    return toPlainText(question.writtenAnswer || "");
  }

  if (question.questionType === "multiple") {
    return (question.correctAnswers || [])
      .map((index) => `${toOptionLabel(index)}. ${readOptionText(question.options[index])}`)
      .join(", ");
  }

  const index = Number(question.correctAnswer);
  if (!Number.isFinite(index)) return "";
  return `${toOptionLabel(index)}. ${readOptionText(question.options[index])}`;
};

const getQuestionResult = (question: ChatQuestion, answer: unknown) => {
  if (question.questionType === "written") {
    const normalizedAnswer = typeof answer === "string" ? toPlainText(answer).toLowerCase() : "";
    const normalizedCorrect = toPlainText(question.writtenAnswer || "").toLowerCase();
    if (!normalizedAnswer) return "Unanswered";
    return normalizedAnswer === normalizedCorrect ? "Correct" : "Wrong";
  }

  if (question.questionType === "multiple") {
    const selected = Array.isArray(answer) ? answer.map((value) => Number(value)).sort((a, b) => a - b) : [];
    const correct = [...(question.correctAnswers || [])].map(Number).sort((a, b) => a - b);
    if (!selected.length) return "Unanswered";
    return selected.length === correct.length && selected.every((value, index) => value === correct[index]) ? "Correct" : "Wrong";
  }

  if (answer === null || answer === undefined || answer === "") return "Unanswered";
  return Number(answer) === Number(question.correctAnswer) ? "Correct" : "Wrong";
};

const extractReferencedQuestionIndex = (message: string, totalQuestions: number) => {
  const match = message.match(/\b(?:question|ques|q|qs)\s*#?\s*(\d+)\b/i);
  if (!match) return null;
  const questionNumber = Number(match[1]);
  if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > totalQuestions) return null;
  return questionNumber - 1;
};

const mapStoredAttachment = (attachment: Partial<ChatAttachment>, index: number): ChatAttachment => ({
  id: attachment.id || createMessageId("user"),
  name: attachment.name || `Attachment ${index + 1}`,
  kind: attachment.kind === "image" || attachment.kind === "pdf" || attachment.kind === "text" ? attachment.kind : "text",
  mimeType: attachment.mimeType || "",
  size: Number(attachment.size || 0),
  previewUrl: attachment.previewUrl,
  extractedText: attachment.extractedText,
  imageDataUrl: attachment.imageDataUrl,
});

const mapSessionMessage = (message: Partial<ChatMessage>, index: number): ChatMessage => ({
  id: message.id || createMessageId(message.role === "assistant" ? "assistant" : "user"),
  role: message.role === "assistant" ? "assistant" : "user",
  content: message.content || "",
  createdAt: message.createdAt || null,
  attachments: Array.isArray(message.attachments)
    ? message.attachments.map((attachment, attachmentIndex) => mapStoredAttachment(attachment, attachmentIndex))
    : [],
});

const buildFallbackPrompt = (attachments: ChatAttachment[]) => {
  if (!attachments.length) {
    return "";
  }

  const names = attachments.map((attachment) => attachment.name).join(", ");
  return `Please analyze the attached file${attachments.length > 1 ? "s" : ""} (${names}) and explain the important points clearly.`;
};

export default function StudentAiChatPanel({
  testTitle,
  questions,
  answers,
  summary,
  timeTaken = 0,
  perQuestionTimes = [],
}: StudentAiChatPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const quickPrompts = useMemo(
    () => [
      "What should I revise first from this test?",
      "Explain question 1 in a simple way.",
      "How can I improve speed without making mistakes?",
    ],
    [],
  );

  const examQuestions = useMemo(
    () =>
      questions.map((question, index) => {
        const answer = answers[String(index)] ?? answers[index];
        return {
          order: index + 1,
          subject: question.subject || "General",
          questionType: question.questionType || "single",
          result: getQuestionResult(question, answer),
          timeSpentSeconds: Number(perQuestionTimes[index] || 0),
          question: truncate(question.question, 220),
          selectedAnswer: truncate(formatSingleAnswer(question, answer), 160) || "Not answered",
          correctAnswer: truncate(formatCorrectAnswer(question), 160) || "Not available",
          explanation: truncate(question.explanation || "", 180) || "Not available",
        };
      }),
    [answers, perQuestionTimes, questions],
  );

  const activePrompts = suggestedPrompts.length > 0 ? suggestedPrompts : quickPrompts;

  const { supported: voiceSupported, listening, startListening, stopListening } = useSpeechToText((transcript) => {
    setPrompt((current) => (current.trim() ? `${current.trimEnd()} ${transcript}` : transcript));
  });

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  };

  const updateScrollState = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const isNearBottom = distanceFromBottom < 96;
    shouldAutoScrollRef.current = isNearBottom;
    setShowJumpToLatest(!isNearBottom);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      try {
        const { data } = await api.get("/chat/sessions");
        if (cancelled) return;
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      } catch {
        if (cancelled) return;
        setSessions([]);
      } finally {
        if (!cancelled) {
          setLoadingSessions(false);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewportRef.current) return;

    if (shouldAutoScrollRef.current) {
      const behavior = messages.length <= 1 ? "auto" : "smooth";
      const frame = window.requestAnimationFrame(() => scrollToBottom(behavior));
      return () => window.cancelAnimationFrame(frame);
    }

    setShowJumpToLatest(true);
  }, [messages, submitting]);

  const refreshSessions = async (preferredSessionId = sessionId) => {
    try {
      const { data } = await api.get("/chat/sessions");
      const nextSessions = Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(nextSessions);

      if (!sessionId && preferredSessionId) {
        setSessionId(preferredSessionId);
      }
    } catch {
      // Keep the current session list if refresh fails.
    }
  };

  const openSession = async (nextSessionId: string) => {
    if (!nextSessionId) return;

    setLoadingConversation(true);
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);

    try {
      const { data } = await api.get(`/chat/sessions/${encodeURIComponent(nextSessionId)}`);
      const session = (data.session || {}) as ChatSessionDetail;
      setSessionId(session.sessionId || nextSessionId);
      setMessages(Array.isArray(session.messages) ? session.messages.map(mapSessionMessage) : []);
      setSuggestedPrompts([]);
      setPendingAttachments([]);
      setPrompt("");
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    } catch (error) {
      toast.error(readApiErrorMessage(error, "Could not load that chat"));
    } finally {
      setLoadingConversation(false);
    }
  };

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    const outboundAttachments = [...pendingAttachments];
    const finalMessage = trimmed || buildFallbackPrompt(outboundAttachments);

    const localUserMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: finalMessage,
      createdAt: new Date().toISOString(),
      attachments: outboundAttachments,
    };

    setSubmitting(true);
    setMessages((current) => [...current, localUserMessage]);
    setPrompt("");
    setPendingAttachments([]);
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);

    try {
      const referencedQuestionIndex = extractReferencedQuestionIndex(finalMessage, questions.length);
      const referencedQuestion = referencedQuestionIndex !== null ? questions[referencedQuestionIndex] : null;
      const referencedAnswer =
        referencedQuestionIndex !== null ? answers[String(referencedQuestionIndex)] ?? answers[referencedQuestionIndex] : undefined;

      const { data } = await api.post("/chat", {
        sessionId: sessionId || undefined,
        message: finalMessage,
        attachments: outboundAttachments.map(({ id, previewUrl, ...attachment }) => attachment),
        context: {
          testTitle: testTitle || "Practice Test",
          summary: {
            score: summary.score,
            totalMarks: summary.totalMarks,
            correct: summary.correct,
            partial: summary.partial,
            wrong: summary.wrong,
            unanswered: summary.unanswered,
            timeTakenSeconds: Number(timeTaken || 0),
            totalQuestions: questions.length,
          },
          questions: examQuestions,
          ...(referencedQuestion
            ? {
                question: referencedQuestion.question,
                questionImage: referencedQuestion.questionImage || "",
                explanationImage: referencedQuestion.explanationImage || "",
                options: referencedQuestion.options,
                selectedAnswer: formatSingleAnswer(referencedQuestion, referencedAnswer),
                correctAnswer: formatCorrectAnswer(referencedQuestion),
                explanation: referencedQuestion.explanation || "",
                topic: `Question ${referencedQuestionIndex + 1}`,
              }
            : {}),
        },
      });

      const nextSessionId = data.sessionId || sessionId;
      if (nextSessionId) {
        setSessionId(nextSessionId);
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          content: data.reply || "No response generated.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestedPrompts(Array.isArray(data.suggestedPrompts) ? data.suggestedPrompts : []);
      void refreshSessions(nextSessionId);
    } catch (error) {
      toast.error(readApiErrorMessage(error, "AI chat request failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachFiles = async (files: FileList) => {
    const supportedFiles = Array.from(files).filter(isSupportedChatAttachment);
    const rejectedCount = files.length - supportedFiles.length;

    if (rejectedCount > 0) {
      toast.error("Only PDF, image, and text files can be attached here.");
    }

    if (!supportedFiles.length) return;

    const availableSlots = Math.max(0, MAX_ATTACHMENTS - pendingAttachments.length);
    if (!availableSlots) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files at a time.`);
      return;
    }

    const nextFiles = supportedFiles.slice(0, availableSlots);

    try {
      const prepared = await Promise.all(nextFiles.map((file) => prepareChatAttachment(file)));
      setPendingAttachments((current) => [...current, ...prepared.filter(Boolean).map((attachment) => attachment as ChatAttachment)]);
    } catch {
      toast.error("One or more files could not be prepared.");
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  };

  const handleNewChat = () => {
    setSessionId("");
    setMessages([]);
    setSuggestedPrompts([]);
    setPrompt("");
    setPendingAttachments([]);
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
  };

  const handleToggleVoice = () => {
    if (!voiceSupported) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }

    if (listening) {
      stopListening();
      return;
    }

    const started = startListening();
    if (!started) {
      toast.error("Voice input could not start.");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="overflow-hidden rounded-3xl border border-[#EAE4DE] p-4 md:p-6"
      style={{ background: "linear-gradient(180deg, #FFFFFF, #FFF9F5)", boxShadow: "0 4px 24px -6px rgba(30,20,12,0.08)" }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E8722A]/20 bg-[#FFF0E5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#E8722A]">
            <Sparkles className="h-3.5 w-3.5" />
            VidyaSaathi
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-md" style={{ background: "linear-gradient(135deg, #E8722A, #D4621E)" }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-semibold text-[#231C17]">VidyaSaathi</h2>
              <p className="mt-1 text-sm leading-6 text-[#7A716A]">
                Ask personal doubts, upload files, use voice, revisit older conversations, and get math-perfect answers based on your completed test.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAE4DE] bg-[#F3EDE7] px-4 py-3 text-sm font-medium text-[#231C17]/70">
          {testTitle || "Practice Test"} • {questions.length} questions
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {activePrompts.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className={cn(
              "h-auto rounded-full border border-[#EAE4DE] bg-[#F3EDE7]/60 px-4 py-2 text-left text-xs leading-5 text-[#231C17]/70 transition-colors",
              "hover:border-[#E8722A]/30 hover:bg-[#FFF0E5] hover:text-[#E8722A] disabled:opacity-50",
            )}
            onClick={() => void sendMessage(suggestion)}
            disabled={submitting || loadingConversation}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar
          sessions={sessions}
          activeSessionId={sessionId}
          loading={loadingSessions}
          onNewChat={handleNewChat}
          onSelectSession={(nextSessionId) => void openSession(nextSessionId)}
        />

        <div className="min-w-0 rounded-3xl border border-[#EAE4DE] bg-white/60 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A716A]/60">Conversation</div>
              <h3 className="mt-2 text-xl font-display font-semibold text-[#231C17]">
                {sessionId ? "Continue your chat" : "Start a new chat"}
              </h3>
            </div>
            {loadingConversation ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#EAE4DE] bg-[#FAF5F0] px-3 py-2 text-xs text-[#7A716A]">
                <Loader2 className="h-4 w-4 animate-spin text-[#E8722A]" />
                Loading conversation...
              </div>
            ) : null}
          </div>

          <div className="flex min-h-[44rem] min-w-0 flex-col gap-3">
            <ChatContainer
              messages={messages}
              suggestedPrompts={activePrompts}
              submitting={submitting}
              showJumpToLatest={showJumpToLatest}
              viewportRef={viewportRef}
              onPromptClick={(nextPrompt) => void sendMessage(nextPrompt)}
              onScroll={updateScrollState}
              onJumpToLatest={() => {
                shouldAutoScrollRef.current = true;
                setShowJumpToLatest(false);
                scrollToBottom("smooth");
              }}
            />

            <InputBox
              value={prompt}
              attachments={pendingAttachments}
              disabled={submitting || loadingConversation}
              listening={listening}
              voiceSupported={voiceSupported}
              onChange={setPrompt}
              onSend={() => void sendMessage(prompt)}
              onAttachFiles={(files) => void handleAttachFiles(files)}
              onRemoveAttachment={handleRemoveAttachment}
              onToggleVoice={handleToggleVoice}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
