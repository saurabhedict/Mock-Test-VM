import { motion } from "framer-motion";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { readApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import FormattedContent from "@/components/FormattedContent";

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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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

export default function StudentAiChatPanel({
  testTitle,
  questions,
  answers,
  summary,
  timeTaken = 0,
  perQuestionTimes = [],
}: StudentAiChatPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setPrompt("");

    try {
      const referencedQuestionIndex = extractReferencedQuestionIndex(trimmed, questions.length);
      const referencedQuestion = referencedQuestionIndex !== null ? questions[referencedQuestionIndex] : null;
      const referencedAnswer =
        referencedQuestionIndex !== null ? answers[String(referencedQuestionIndex)] ?? answers[referencedQuestionIndex] : undefined;

      const { data } = await api.post("/chat", {
        sessionId: sessionId || undefined,
        message: trimmed,
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
                topic: `Question ${referencedQuestionIndex! + 1}`,
              }
            : {}),
        },
      });

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages((current) => [...current, { role: "assistant", content: data.reply || "No response generated." }]);
      setSuggestedPrompts(Array.isArray(data.suggestedPrompts) ? data.suggestedPrompts : []);
    } catch (error) {
      setMessages((current) => current.slice(0, -1));
      toast.error(readApiErrorMessage(error, "AI chat request failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-3xl border border-[#EAE4DE] p-6"
      style={{ background: "linear-gradient(180deg, #FFFFFF, #FFF9F5)", boxShadow: "0 4px 24px -6px rgba(30,20,12,0.08)" }}
    >
      {/* Header */}
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
                Ask personal doubts, question-wise doubts, shortcuts, or what to study next. The AI already has your test answers, correct answers, explanations, and timing.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAE4DE] bg-[#F3EDE7] px-4 py-3 text-sm font-medium text-[#231C17]/70">
          {testTitle || "Practice Test"} • {questions.length} questions
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="mt-5 flex flex-wrap gap-2">
        {activePrompts.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="h-auto rounded-full border border-[#EAE4DE] bg-[#F3EDE7]/60 px-4 py-2 text-left text-xs leading-5 text-[#231C17]/70 hover:border-[#E8722A]/30 hover:bg-[#FFF0E5] hover:text-[#E8722A] transition-colors disabled:opacity-50"
            onClick={() => void sendMessage(suggestion)}
            disabled={submitting}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="mt-6 rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] p-5">
        {/* Messages area */}
        <ScrollArea className="h-[26rem] pr-2">
          <div className="space-y-3">
            {messages.length === 0 && !submitting ? (
              <div className="rounded-2xl border border-dashed border-[#EAE4DE] bg-white p-4 text-sm leading-7 text-[#7A716A]">
                Try asking something like <span className="font-medium text-[#E8722A]">"Explain question 12"</span> or{" "}
                <span className="font-medium text-[#E8722A]">"What are my weak areas?"</span>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7",
                  message.role === "assistant"
                    ? "border border-[#EAE4DE] bg-white text-[#231C17] shadow-sm"
                    : "ml-auto border border-[#E8722A]/20 bg-[#FFF0E5] text-[#231C17]",
                )}
              >
                <div className={cn(
                  "mb-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                  message.role === "assistant" ? "text-[#E8722A]" : "text-[#231C17]/45",
                )}>
                  {message.role === "assistant" ? "VidyaSaathi" : "You"}
                </div>
                {message.role === "assistant" ? (
                  <FormattedContent html={message.content} className="text-sm text-current whitespace-pre-wrap" />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            ))}

            {submitting ? (
              <div className="max-w-[75%] rounded-2xl border border-[#EAE4DE] bg-white px-4 py-3 text-sm text-[#231C17]/70 shadow-sm">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8722A]">VidyaSaathi</div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#E8722A]" />
                  Thinking...
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        {/* Divider */}
        <div className="my-4 border-t border-[#EAE4DE]" />

        {/* Input area */}
        <div className="flex items-end gap-3">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (prompt.trim() && !submitting) void sendMessage(prompt);
              }
            }}
            placeholder="Ask anything about your performance or mention a question number..."
            className="min-h-[52px] max-h-32 flex-1 resize-none rounded-2xl border-[#EAE4DE] bg-white px-4 py-3 text-sm text-[#231C17] placeholder:text-[#7A716A]/60 focus-visible:ring-[#E8722A]/30"
            rows={1}
          />
          <Button
            onClick={() => void sendMessage(prompt)}
            disabled={submitting || !prompt.trim()}
            className="h-[52px] rounded-2xl px-5 text-white hover:brightness-110 transition-all"
            style={{ background: "linear-gradient(135deg, #E8722A, #D4621E)", boxShadow: "0 2px 20px -4px rgba(232,114,42,0.3)" }}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
