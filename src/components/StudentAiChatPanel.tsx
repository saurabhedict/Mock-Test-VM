import { useMemo, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function StudentAiChatPanel({ questions, answers }: StudentAiChatPanelProps) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<string>("general");
  const [prompt, setPrompt] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedQuestion = useMemo(() => {
    if (selectedQuestionIndex === "general") return null;
    const index = Number(selectedQuestionIndex);
    return Number.isFinite(index) ? questions[index] : null;
  }, [questions, selectedQuestionIndex]);

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
      toast.error("AI chat request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="border-b bg-card/80">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          AI Chat Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask about a specific question or switch to general study help.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Context
          </label>
          <select
            value={selectedQuestionIndex}
            onChange={(event) => setSelectedQuestionIndex(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="general">General study question</option>
            {questions.map((_, index) => (
              <option key={index} value={String(index)}>
                Question {index + 1}
              </option>
            ))}
          </select>
        </div>

        <ScrollArea className="h-72 rounded-xl border bg-muted/20 p-3">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">
                Try: "Explain why my answer was wrong in question 3" or "Give me a shortcut for time and work problems."
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-xl px-4 py-3 text-sm ${
                    message.role === "assistant"
                      ? "bg-background text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                    {message.role === "assistant" ? "AI Coach" : "You"}
                  </div>
                  <div className="whitespace-pre-wrap leading-6">{message.content}</div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {suggestedPrompts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto whitespace-normal text-left"
                onClick={() => sendMessage(suggestion)}
                disabled={submitting}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask for an explanation, doubt clarification, or study advice."
            className="min-h-28"
          />
          <Button onClick={() => sendMessage(prompt)} disabled={submitting || !prompt.trim()} className="w-full">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send to AI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
