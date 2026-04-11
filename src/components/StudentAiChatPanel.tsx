import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/services/api";
import ChatContainer from "@/components/chat/ChatContainer";
import InputBox from "@/components/chat/InputBox";
import Sidebar from "@/components/chat/Sidebar";
import { isSupportedChatAttachment, prepareChatAttachment } from "@/components/chat/chatAttachments";
import type { ChatAttachment, ChatMessage, ChatSessionDetail, ChatSessionSummary } from "@/components/chat/types";
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
const STORAGE_PREFIX = "student-ai-chat";

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

const buildFallbackPrompt = (attachments: ChatAttachment[]) => {
  if (!attachments.length) {
    return "";
  }

  const names = attachments.map((attachment) => attachment.name).join(", ");
  return `Please analyze the attached file${attachments.length > 1 ? "s" : ""} (${names}) and explain the important points clearly.`;
};

const buildStorageKey = (testTitle?: string, totalQuestions = 0) =>
  `${STORAGE_PREFIX}:${(testTitle || "practice-test").toLowerCase().replace(/\s+/g, "-")}:${totalQuestions}`;

const sanitizeAttachment = (attachment: Partial<ChatAttachment>, index: number): ChatAttachment => ({
  id: attachment.id || `attachment-${index}-${Date.now()}`,
  name: attachment.name || `Attachment ${index + 1}`,
  kind: attachment.kind === "image" || attachment.kind === "pdf" || attachment.kind === "text" ? attachment.kind : "text",
  mimeType: attachment.mimeType || "",
  size: Number(attachment.size || 0),
  previewUrl: attachment.previewUrl,
  extractedText: attachment.extractedText,
  imageDataUrl: attachment.imageDataUrl,
});

const sanitizeMessage = (message: Partial<ChatMessage>, index: number): ChatMessage => ({
  id: message.id || `message-${index}-${Date.now()}`,
  role: message.role === "assistant" ? "assistant" : "user",
  content: message.content || "",
  createdAt: message.createdAt || null,
  attachments: Array.isArray(message.attachments)
    ? message.attachments.map((attachment, attachmentIndex) => sanitizeAttachment(attachment, attachmentIndex))
    : [],
});

const toSessionSummary = (session: ChatSessionDetail): ChatSessionSummary => ({
  sessionId: session.sessionId,
  title: session.title,
  contextLabel: session.contextLabel,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  lastMessagePreview: session.lastMessagePreview,
  messageCount: session.messageCount,
});

const readStoredSessions = (storageKey: string) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [] as ChatSessionDetail[];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as ChatSessionDetail[];

    return parsed
      .map((session: Partial<ChatSessionDetail>) => ({
        sessionId: session.sessionId || createMessageId("assistant"),
        title: session.title || "New chat",
        contextLabel: session.contextLabel || "",
        createdAt: session.createdAt || null,
        updatedAt: session.updatedAt || null,
        lastMessagePreview: session.lastMessagePreview || "",
        messageCount: Number(session.messageCount || 0),
        messages: Array.isArray(session.messages) ? session.messages.map(sanitizeMessage) : [],
      }))
      .filter((session: ChatSessionDetail) => session.messages.length > 0);
  } catch {
    return [] as ChatSessionDetail[];
  }
};

const sortSessions = (sessions: ChatSessionDetail[]) =>
  [...sessions].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });

const upsertSession = (sessions: ChatSessionDetail[], nextSession: ChatSessionDetail) =>
  sortSessions([nextSession, ...sessions.filter((session) => session.sessionId !== nextSession.sessionId)]);

export default function StudentAiChatPanel({
  testTitle,
  questions,
  answers,
  summary,
  timeTaken = 0,
  perQuestionTimes = [],
}: StudentAiChatPanelProps) {
  const storageKey = useMemo(() => buildStorageKey(testTitle, questions.length), [testTitle, questions.length]);
  const activeSessionKey = `${storageKey}:active`;
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionDetail[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
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

  const sessions = useMemo(() => chatSessions.map(toSessionSummary), [chatSessions]);
  const activePrompts = suggestedPrompts.length > 0 ? suggestedPrompts : quickPrompts;
  const { supported: voiceSupported, listening, interimTranscript, startListening, stopListening } = useSpeechToText((transcript) => {
    setPrompt((current) => (current.trim() ? `${current.trimEnd()} ${transcript}` : transcript));
  });

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  };

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const isNearBottom = distanceFromBottom < 96;
    shouldAutoScrollRef.current = isNearBottom;
    setShowJumpToLatest(!isNearBottom);
  }, []);

  const persistConversation = (nextSessionId: string, nextMessages: ChatMessage[]) => {
    const now = new Date().toISOString();

    setChatSessions((current) => {
      const existingSession = current.find((session) => session.sessionId === nextSessionId);
      const firstUserMessage = nextMessages.find((message) => message.role === "user")?.content || existingSession?.title || "New chat";
      const nextSession: ChatSessionDetail = {
        sessionId: nextSessionId,
        title: truncate(firstUserMessage, 60) || "New chat",
        contextLabel: testTitle || "Practice Test",
        createdAt: existingSession?.createdAt || nextMessages[0]?.createdAt || now,
        updatedAt: now,
        lastMessagePreview: truncate(nextMessages[nextMessages.length - 1]?.content || "", 100),
        messageCount: nextMessages.length,
        messages: nextMessages,
      };

      return upsertSession(current, nextSession);
    });
  };

  useEffect(() => {
    const storedSessions = readStoredSessions(storageKey);
    setChatSessions(storedSessions);

    const activeSessionId = localStorage.getItem(activeSessionKey) || "";
    if (!activeSessionId) {
      setSessionId("");
      setMessages([]);
      return;
    }

    const activeSession = storedSessions.find((session) => session.sessionId === activeSessionId);
    if (!activeSession) {
      setSessionId("");
      setMessages([]);
      return;
    }

    setSessionId(activeSession.sessionId);
    setMessages(activeSession.messages);
  }, [activeSessionKey, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(chatSessions));
  }, [chatSessions, storageKey]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(activeSessionKey, sessionId);
      return;
    }

    localStorage.removeItem(activeSessionKey);
  }, [activeSessionKey, sessionId]);

  useEffect(() => {
    if (!viewportRef.current) return;

    if (shouldAutoScrollRef.current) {
      const behavior = messages.length <= 1 ? "auto" : "smooth";
      const frame = window.requestAnimationFrame(() => scrollToBottom(behavior));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [messages, submitting]);

  const openSession = (nextSessionId: string) => {
    const nextSession = chatSessions.find((session) => session.sessionId === nextSessionId);
    if (!nextSession) return;

    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    setSessionId(nextSession.sessionId);
    setMessages(nextSession.messages);
    setSuggestedPrompts([]);
    setPendingAttachments([]);
    setPrompt("");
    window.requestAnimationFrame(() => scrollToBottom("auto"));
  };

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    if (listening) {
      stopListening();
    }

    const outboundAttachments = [...pendingAttachments];
    const finalMessage = trimmed || buildFallbackPrompt(outboundAttachments);
    const nextSessionId = sessionId || createMessageId("assistant");
    const localUserMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: finalMessage,
      createdAt: new Date().toISOString(),
      attachments: outboundAttachments,
    };
    const nextUserMessages = [...messages, localUserMessage];

    setSessionId(nextSessionId);
    setSubmitting(true);
    setMessages(nextUserMessages);
    setPrompt("");
    setPendingAttachments([]);
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    persistConversation(nextSessionId, nextUserMessages);

    try {
      const referencedQuestionIndex = extractReferencedQuestionIndex(finalMessage, questions.length);
      const referencedQuestion = referencedQuestionIndex !== null ? questions[referencedQuestionIndex] : null;
      const referencedAnswer =
        referencedQuestionIndex !== null ? answers[String(referencedQuestionIndex)] ?? answers[referencedQuestionIndex] : undefined;

      const { data } = await api.post("/chat", {
        sessionId: nextSessionId,
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

      const assistantMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: data.reply || "No response generated.",
        createdAt: new Date().toISOString(),
      };
      const nextConversation = [...nextUserMessages, assistantMessage];

      setMessages(nextConversation);
      setSuggestedPrompts(Array.isArray(data.suggestedPrompts) ? data.suggestedPrompts : []);
      persistConversation(nextSessionId, nextConversation);
    } catch (error) {
      toast.error(readApiErrorMessage(error, "AI chat request failed"));
      setMessages(messages);
      persistConversation(nextSessionId, messages);
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

    try {
      const prepared = await Promise.all(supportedFiles.slice(0, availableSlots).map((file) => prepareChatAttachment(file)));
      const nextAttachments = prepared.filter(Boolean) as ChatAttachment[];
      setPendingAttachments((current) => [...current, ...nextAttachments]);
    } catch {
      toast.error("One or more files could not be prepared.");
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  };

  const handleNewChat = () => {
    if (listening) {
      stopListening();
    }

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
      transition={{ duration: 0.25, ease: "easeOut" }}
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
                Smooth math rendering, clean scrolling chat, voice input, file upload, and simple local chat history.
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
            disabled={submitting}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <Sidebar
          sessions={sessions}
          activeSessionId={sessionId}
          onNewChat={handleNewChat}
          onSelectSession={openSession}
        />

        <div className="min-w-0 rounded-3xl border border-[#EAE4DE] bg-white/60 p-3 sm:p-4">
          <div className="mb-3 px-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A716A]/60">Conversation</div>
            <h3 className="mt-2 text-xl font-display font-semibold text-[#231C17]">
              {sessionId ? "Continue your chat" : "Start a new chat"}
            </h3>
          </div>

          <div className="flex h-[55vh] min-h-[400px] max-h-[600px] min-w-0 flex-col gap-3 overflow-hidden">
            <ChatContainer
              messages={messages}
              suggestedPrompts={activePrompts}
              submitting={submitting}
              showJumpToLatest={showJumpToLatest}
              viewportRef={viewportRef}
              onPromptClick={sendMessage}
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
              disabled={submitting}
              listening={listening}
              interimTranscript={interimTranscript}
              voiceSupported={voiceSupported}
              onChange={setPrompt}
              onSend={() => {
                const message = `${prompt} ${interimTranscript}`.trim();
                void sendMessage(message);
              }}
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
