import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, ChevronDown, Loader2, MessageSquare, Mic, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { readApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ChatQuestion = {
  question: string;
  options: Array<string | { text: string; imageUrl?: string }>;
  explanation?: string;
  questionType?: string;
  correctAnswer?: number;
  correctAnswers?: number[];
  writtenAnswer?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface StudentAiChatPanelProps {
  questions: ChatQuestion[];
  answers: Record<string, unknown>;
}

const toOptionLabel = (index: number) => String.fromCharCode(65 + index);

const readOptionText = (option: string | { text: string; imageUrl?: string }) =>
  typeof option === "string" ? option : option?.text || "";

const toPlainText = (value = "") => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const formatSingleAnswer = (question: ChatQuestion, answer: unknown) => {
  if (question.questionType === "written") {
    return typeof answer === "string" ? answer : "";
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
    return question.writtenAnswer || "";
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

const waveformBars = [0.6, 0.95, 0.45, 0.85, 0.55, 1, 0.5];

export default function StudentAiChatPanel({ questions, answers }: StudentAiChatPanelProps) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<string>("general");
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [voicePulse, setVoicePulse] = useState(false);

  const selectedQuestion = useMemo(() => {
    if (selectedQuestionIndex === "general") return null;
    const index = Number(selectedQuestionIndex);
    return Number.isFinite(index) ? questions[index] : null;
  }, [questions, selectedQuestionIndex]);

  const selectedQuestionNumber = useMemo(() => {
    const index = Number(selectedQuestionIndex);
    return Number.isFinite(index) ? index + 1 : null;
  }, [selectedQuestionIndex]);

  const quickPrompts = useMemo(() => {
    if (selectedQuestion && selectedQuestionNumber) {
      return [
        `Explain why my answer was wrong in Question ${selectedQuestionNumber}.`,
        `Give me a shortcut for Question ${selectedQuestionNumber}.`,
        `What concept should I revise from this question?`,
      ];
    }

    return [
      "Give me a 15-minute revision plan from this test.",
      "Which topics should I focus on next?",
      "How can I improve my speed without losing accuracy?",
    ];
  }, [selectedQuestion, selectedQuestionNumber]);

  const activeSuggestions = suggestedPrompts.length > 0 ? suggestedPrompts : quickPrompts;

  const selectedQuestionPreview = useMemo(() => {
    if (!selectedQuestion) return "";
    return toPlainText(selectedQuestion.question).slice(0, 180);
  }, [selectedQuestion]);

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setPrompt("");

    try {
      const questionIndex = selectedQuestionIndex === "general" ? null : Number(selectedQuestionIndex);
      const question = questionIndex !== null && Number.isFinite(questionIndex) ? questions[questionIndex] : null;
      const questionAnswer = questionIndex !== null ? answers[String(questionIndex)] : undefined;

      const { data } = await api.post("/chat", {
        sessionId: sessionId || undefined,
        message: trimmed,
        context: question
          ? {
              question: question.question,
              options: question.options,
              selectedAnswer: formatSingleAnswer(question, questionAnswer),
              correctAnswer: formatCorrectAnswer(question),
              explanation: question.explanation || "",
              topic: `Question ${questionIndex! + 1}`,
            }
          : {},
      });

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages((current) => [...current, { role: "assistant", content: data.reply || "No response generated." }]);
      setSuggestedPrompts(data.suggestedPrompts || []);
    } catch (error) {
      setMessages((current) => current.slice(0, -1));
      toast.error(readApiErrorMessage(error, "AI chat request failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceClick = () => {
    setVoicePulse(true);
    toast.info("Voice input UI is ready; live voice capture can be wired next.");
    window.setTimeout(() => setVoicePulse(false), 1600);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="ai-glass-panel relative overflow-hidden rounded-[32px] border border-white/10 px-5 py-5 text-white shadow-[0_35px_120px_rgba(0,0,0,0.45)] md:px-7 md:py-6"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-0 h-36 w-36 rounded-full bg-[#8a2be2]/20 blur-3xl animate-[ai-drift_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-[#00e5ff]/12 blur-3xl animate-[ai-float_12s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              <span className={cn("h-2.5 w-2.5 rounded-full bg-[#00e5ff]", voicePulse && "animate-[ai-pulse_1.2s_ease-in-out_infinite]")} />
              AI Chat Assistant
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-[0_0_25px_rgba(0,229,255,0.16)]">
                <MessageSquare className="h-5 w-5 text-[#00e5ff]" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-semibold text-white">AI Coaching Console</h2>
                <p className="mt-1 max-w-2xl text-sm text-white/65">
                  Ask about a single question, your speed pattern, or your next best study move.
                </p>
              </div>
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleVoiceClick}
            className="group inline-flex items-center gap-3 self-start rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF7A18]/15 text-[#FF7A18]">
              <Mic className="h-4 w-4" />
            </div>
            <div className="flex items-end gap-1">
              {waveformBars.map((height, index) => (
                <span
                  key={index}
                  className="w-1 rounded-full bg-gradient-to-t from-[#ff7a18] via-[#8a2be2] to-[#00e5ff] animate-[ai-wave_1.2s_ease-in-out_infinite]"
                  style={{
                    height: `${16 + height * 18}px`,
                    animationDelay: `${index * 0.08}s`,
                  }}
                />
              ))}
            </div>
            <span>Voice Input</span>
          </motion.button>
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <motion.div
            whileHover={{ y: -4, rotateX: 3, rotateY: -3 }}
            transition={{ duration: 0.25 }}
            className="ai-glass-panel rounded-[28px] border border-white/10 bg-white/[0.04] p-4"
          >
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              Context Channel
            </label>
            <div className="relative">
              <select
                value={selectedQuestionIndex}
                onChange={(event) => setSelectedQuestionIndex(event.target.value)}
                className="h-14 w-full appearance-none rounded-2xl border border-white/10 bg-[#0f1016]/90 px-4 pr-12 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition duration-300 focus:border-[#00e5ff]/60 focus:shadow-[0_0_0_1px_rgba(0,229,255,0.22),0_0_25px_rgba(0,229,255,0.12)]"
              >
                <option value="general">General study guidance</option>
                {questions.map((_, index) => (
                  <option key={index} value={String(index)}>
                    Question {index + 1}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, rotateX: 2.5, rotateY: 2.5 }}
            transition={{ duration: 0.25 }}
            className="ai-glass-panel rounded-[28px] border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
              Active Focus
            </div>
            {selectedQuestion ? (
              <>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/10 px-3 py-1 text-xs font-medium text-[#8defff]">
                  Question {selectedQuestionNumber}
                </div>
                <p className="text-sm leading-7 text-white/80">
                  {selectedQuestionPreview || "This question contains media-rich content. Ask the AI to unpack the concept or the final option logic."}
                </p>
              </>
            ) : (
              <p className="text-sm leading-7 text-white/70">
                No question is pinned right now. Ask for revision planning, accuracy strategy, or weak-topic coaching.
              </p>
            )}
          </motion.div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="ai-glass-panel rounded-[30px] border border-white/10 bg-[#0f1016]/75 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">Conversation Stream</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-white/65">
                  <AudioLines className="h-4 w-4 text-[#8a2be2]" />
                  Neural response channel
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50">
                <span className="h-2 w-2 rounded-full bg-[#00e5ff] animate-[ai-pulse_1.6s_ease-in-out_infinite]" />
                Live
              </div>
            </div>

            <ScrollArea className="h-[25rem] rounded-[24px] border border-white/10 bg-black/20 p-3 md:p-4">
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {messages.length === 0 && !submitting ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="ai-shimmer-track rounded-[24px] border border-dashed border-white/12 bg-white/[0.04] p-5 text-sm leading-7 text-white/60"
                    >
                      Try a short prompt like <span className="text-[#ffb36d]">“explain”</span> after selecting a question,
                      or ask for a pattern review across the full attempt.
                    </motion.div>
                  ) : null}

                  {messages.map((message, index) => (
                    <motion.div
                      key={`${message.role}-${index}`}
                      initial={{ opacity: 0, x: message.role === "assistant" ? -18 : 18, y: 8 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.24 }}
                      className={cn(
                        "max-w-[88%] rounded-[26px] px-4 py-3 text-sm shadow-[0_20px_50px_rgba(0,0,0,0.22)]",
                        message.role === "assistant"
                          ? "border border-[#8a2be2]/25 bg-[linear-gradient(135deg,rgba(138,43,226,0.16),rgba(0,229,255,0.08))] text-white/85"
                          : "ml-auto border border-[#ff7a18]/35 bg-[linear-gradient(135deg,rgba(255,122,24,0.92),rgba(255,122,24,0.72))] text-white"
                      )}
                    >
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                        {message.role === "assistant" ? "AI Coach" : "You"}
                      </div>
                      <div className="whitespace-pre-wrap leading-7">{message.content}</div>
                    </motion.div>
                  ))}

                  {submitting ? (
                    <motion.div
                      key="thinking"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="max-w-[70%] rounded-[26px] border border-[#00e5ff]/20 bg-[linear-gradient(135deg,rgba(0,229,255,0.12),rgba(138,43,226,0.08))] px-4 py-4 text-sm text-white/75"
                    >
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9cecff]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#00e5ff] animate-[ai-pulse_1.2s_ease-in-out_infinite]" />
                        AI Thinking
                      </div>
                      <div className="flex items-center gap-2">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="h-2.5 w-2.5 rounded-full bg-white/80 animate-[ai-pulse_1s_ease-in-out_infinite]"
                            style={{ animationDelay: `${dot * 0.12}s` }}
                          />
                        ))}
                        <span className="ml-2 text-white/55">Synthesizing explanation...</span>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-5">
            <div className="ai-glass-panel rounded-[30px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
                Prompt Launchers
              </div>
              <div className="flex flex-wrap gap-2.5">
                {activeSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto rounded-2xl border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs leading-5 text-white/78 hover:bg-white/[0.08] hover:text-white"
                      onClick={() => sendMessage(suggestion)}
                      disabled={submitting}
                    >
                      {suggestion}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="ai-glass-panel rounded-[30px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">Command Input</div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/45">
                  <Sparkles className="h-3.5 w-3.5 text-[#ff7a18]" />
                  Neural mode
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask for an explanation, a shortcut, or an AI-generated study move."
                className="min-h-36 rounded-[24px] border-white/10 bg-[#0d1017]/90 px-4 py-4 text-white placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus-visible:ring-[#00e5ff]/40"
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-end gap-1.5">
                  {waveformBars.map((height, index) => (
                    <span
                      key={index}
                      className="w-1 rounded-full bg-gradient-to-t from-[#00e5ff] via-[#8a2be2] to-[#ff7a18] animate-[ai-wave_1.3s_ease-in-out_infinite]"
                      style={{
                        height: `${12 + height * 14}px`,
                        animationDelay: `${index * 0.07}s`,
                      }}
                    />
                  ))}
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                  <Button
                    onClick={() => sendMessage(prompt)}
                    disabled={submitting || !prompt.trim()}
                    className="ai-glow-button w-full rounded-[24px] border-0 bg-[linear-gradient(135deg,#ff7a18,#ff9b4b_40%,#8a2be2_90%)] px-5 py-6 text-sm font-semibold text-white hover:brightness-110"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send to AI
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
