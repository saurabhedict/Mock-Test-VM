import React, { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Home,
  ImagePlus,
  Loader2,
  MinusCircle,
  Plus,
  PlusCircle,
  Save,
  Trash,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import RichTextEditor from "@/components/RichTextEditor";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type QuestionType = "single" | "multiple" | "written";
type MultipleCorrectScoringMode = "full_only" | "partial_positive" | "partial_with_negative" | "no_negative_multiple";

interface QuestionOption {
  _id?: string;
  clientId: string;
  text: string;
  imageUrl?: string;
}

interface Question {
  clientId: string;
  _id?: string;
  question: string;
  questionType: QuestionType;
  questionImage?: string;
  options: QuestionOption[];
  correctAnswer: number;
  correctAnswers: number[];
  writtenAnswer?: string;
  subject?: string;
  explanation?: string;
  explanationImage?: string;
  marksPerQuestion?: number | "";
  negativeMarksPerQuestion?: number | "";
  multipleCorrectScoringMode?: MultipleCorrectScoringMode;
}

interface SaveProgressState {
  current: number;
  total: number;
  failed: string[];
}

type ImageUploadTarget = "question" | "explanation" | { optionClientId: string };

const FIELD_DEBOUNCE_MS = 350;
const SAVE_BATCH_SIZE = 25;
const SAVE_FALLBACK_PARALLEL_SIZE = 10;
const FLUSH_EDITOR_EVENT = "question-editor-flush";

const QUESTION_CARD_STYLE: React.CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "1000px",
};

const createClientId = () =>
  globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const chunkArray = <T,>(items: T[], chunkSize: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const emptyOption = (): QuestionOption => ({ clientId: createClientId(), text: "" });
const defaultOptions = () => [emptyOption(), emptyOption(), emptyOption(), emptyOption()];

const normalizeOptions = (questionType: QuestionType, options?: Array<Partial<QuestionOption>>) => {
  if (questionType === "written") return [];
  if (!options?.length) return defaultOptions();

  return options.map((option) => ({
    _id: option._id,
    clientId: option.clientId || option._id || createClientId(),
    text: option.text || "",
    imageUrl: option.imageUrl,
  }));
};

const normalizeCorrectAnswers = (questionType: QuestionType, question: Partial<Question>) => {
  if (questionType === "written") return [];

  const rawAnswers =
    Array.isArray(question.correctAnswers) && question.correctAnswers.length
      ? question.correctAnswers
      : question.correctAnswer !== undefined
        ? [question.correctAnswer]
        : [0];

  const normalizedAnswers = [...new Set(rawAnswers.map(Number).filter((value) => Number.isInteger(value) && value >= 0))];
  return questionType === "multiple" ? normalizedAnswers.sort((a, b) => a - b) : [normalizedAnswers[0] ?? 0];
};

const normalizeQuestion = (question: Partial<Question>, fallbackSubject = ""): Question => {
  const questionType = question.questionType || "single";
  const correctAnswers = normalizeCorrectAnswers(questionType, question);
  const correctAnswer = questionType === "written" ? -1 : correctAnswers[0] ?? 0;

  return {
    clientId: question.clientId || question._id || createClientId(),
    _id: question._id,
    question: question.question || "",
    questionType,
    questionImage: question.questionImage || "",
    options: normalizeOptions(questionType, question.options),
    correctAnswer,
    correctAnswers,
    writtenAnswer: question.writtenAnswer || "",
    subject: question.subject || fallbackSubject,
    explanation: question.explanation || "",
    explanationImage: question.explanationImage || "",
    marksPerQuestion: question.marksPerQuestion ?? "",
    negativeMarksPerQuestion: question.negativeMarksPerQuestion ?? "",
    multipleCorrectScoringMode: questionType === "multiple" ? question.multipleCorrectScoringMode || "full_only" : "full_only",
  };
};

const serializeQuestion = (question: Question) => ({
  questionId: question._id,
  question: question.question,
  questionType: question.questionType,
  questionImage: question.questionImage,
  options: question.options.map(({ text, imageUrl }) => ({ text, imageUrl })),
  correctAnswer: question.correctAnswer,
  correctAnswers: question.questionType === "multiple" ? question.correctAnswers : [question.correctAnswer],
  writtenAnswer: question.writtenAnswer,
  subject: question.subject,
  explanation: question.explanation,
  explanationImage: question.explanationImage,
  marksPerQuestion: question.marksPerQuestion,
  negativeMarksPerQuestion: question.negativeMarksPerQuestion,
  multipleCorrectScoringMode: question.multipleCorrectScoringMode,
});

const createEmptyQuestion = (subject: string): Question => ({
  clientId: createClientId(),
  question: "",
  questionType: "single",
  options: defaultOptions(),
  correctAnswer: 0,
  correctAnswers: [0],
  writtenAnswer: "",
  subject,
  explanation: "",
  marksPerQuestion: "",
  negativeMarksPerQuestion: "",
  multipleCorrectScoringMode: "full_only",
});

interface BufferedRichTextEditorProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  className?: string;
  editorClassName?: string;
  debounceMs?: number;
}

const BufferedRichTextEditor = memo(function BufferedRichTextEditor({
  value,
  onCommit,
  placeholder,
  className,
  editorClassName,
  debounceMs = FIELD_DEBOUNCE_MS,
}: BufferedRichTextEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebouncedValue(localValue, debounceMs);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (debouncedValue === value) return;
    startTransition(() => onCommit(debouncedValue));
  }, [debouncedValue, onCommit, value]);

  useEffect(() => {
    const flushEditor = () => {
      if (localValue !== value) {
        onCommit(localValue);
      }
    };

    window.addEventListener(FLUSH_EDITOR_EVENT, flushEditor);
    return () => window.removeEventListener(FLUSH_EDITOR_EVENT, flushEditor);
  }, [localValue, onCommit, value]);

  return (
    <RichTextEditor
      value={localValue}
      onChange={setLocalValue}
      placeholder={placeholder}
      className={className}
      editorClassName={editorClassName}
      showPreview={false}
    />
  );
});

interface OptionEditorProps {
  questionClientId: string;
  questionType: QuestionType;
  option: QuestionOption;
  optionIndex: number;
  isSelected: boolean;
  canRemove: boolean;
  onToggleCorrectAnswer: (questionClientId: string, optionIndex: number) => void;
  onRemoveOption: (questionClientId: string, optionClientId: string) => void;
  onUpdateOptionText: (questionClientId: string, optionClientId: string, text: string) => void;
  onImageUpload: (questionClientId: string, type: ImageUploadTarget, file: File) => Promise<void>;
}

const OptionEditor = memo(function OptionEditor({
  questionClientId,
  questionType,
  option,
  optionIndex,
  isSelected,
  canRemove,
  onToggleCorrectAnswer,
  onRemoveOption,
  onUpdateOptionText,
  onImageUpload,
}: OptionEditorProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold">Option {optionIndex + 1}</label>
        <div className="flex items-center gap-2">
          <input
            type={questionType === "multiple" ? "checkbox" : "radio"}
            name={`correct-${questionClientId}`}
            checked={isSelected}
            onChange={() => onToggleCorrectAnswer(questionClientId, optionIndex)}
          />
          <Button type="button" variant="ghost" size="icon" disabled={!canRemove} onClick={() => onRemoveOption(questionClientId, option.clientId)}>
            <MinusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BufferedRichTextEditor
        value={option.text}
        onCommit={(value) => onUpdateOptionText(questionClientId, option.clientId, value)}
        placeholder={`Paste option ${optionIndex + 1} here, or use Math for formulas`}
        editorClassName="min-h-[76px]"
      />

      <div className="mt-1 flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          className="hidden"
          id={`opt-img-${questionClientId}-${option.clientId}`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImageUpload(questionClientId, { optionClientId: option.clientId }, file);
          }}
        />
        <button className="flex items-center text-[10px] font-bold uppercase text-muted-foreground transition-colors hover:text-primary">
          <label htmlFor={`opt-img-${questionClientId}-${option.clientId}`} className="flex cursor-pointer items-center">
            <ImagePlus className="mr-1 h-3 w-3" /> Add Image
          </label>
        </button>
        {option.imageUrl && <img src={option.imageUrl} alt="Preview" className="h-8 w-8 rounded border object-cover" loading="lazy" />}
      </div>
    </div>
  );
});

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  availableSubjects: string[];
  isSaving: boolean;
  isDeleting: boolean;
  isSavingAll: boolean;
  isDirty: boolean;
  onSave: (questionClientId: string) => void;
  onDelete: (questionClientId: string) => void;
  onQuestionChange: (questionClientId: string, updates: Partial<Question>) => void;
  onQuestionTypeChange: (questionClientId: string, questionType: QuestionType) => void;
  onAddOption: (questionClientId: string) => void;
  onRemoveOption: (questionClientId: string, optionClientId: string) => void;
  onToggleCorrectAnswer: (questionClientId: string, optionIndex: number) => void;
  onUpdateOptionText: (questionClientId: string, optionClientId: string, text: string) => void;
  onImageUpload: (questionClientId: string, type: ImageUploadTarget, file: File) => Promise<void>;
}

const QuestionCard = memo(function QuestionCard({
  question,
  questionIndex,
  availableSubjects,
  isSaving,
  isDeleting,
  isSavingAll,
  isDirty,
  onSave,
  onDelete,
  onQuestionChange,
  onQuestionTypeChange,
  onAddOption,
  onRemoveOption,
  onToggleCorrectAnswer,
  onUpdateOptionText,
  onImageUpload,
}: QuestionCardProps) {
  const saveStateLabel = !question._id ? "New" : isDirty ? "Unsaved" : "Saved";

  return (
    <Card className="overflow-hidden border border-border shadow-sm" style={QUESTION_CARD_STYLE}>
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 p-4">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Question {questionIndex + 1}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isDirty || !question._id ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span>{saveStateLabel}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{saveStateLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onSave(question.clientId)} disabled={isSavingAll || isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save {question._id ? "Update" : "New"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-red-50"
            onClick={() => onDelete(question.clientId)}
            disabled={isSavingAll || isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {availableSubjects.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase">Subject</label>
              <select
                value={question.subject || availableSubjects[0]}
                onChange={(event) => onQuestionChange(question.clientId, { subject: event.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {availableSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase">Question Type</label>
            <select
              value={question.questionType}
              onChange={(event) => onQuestionTypeChange(question.clientId, event.target.value as QuestionType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="single">Single Correct</option>
              <option value="multiple">Multiple Select</option>
              <option value="written">Written Answer</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase">Positive Marks Override</label>
            <Input
              type="number"
              min="0"
              step="0.25"
              placeholder="Leave blank to use subject default"
              value={question.marksPerQuestion}
              onChange={(event) => onQuestionChange(question.clientId, { marksPerQuestion: event.target.value === "" ? "" : parseFloat(event.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase">Negative Marks Override</label>
            <Input
              type="number"
              min="0"
              step="0.25"
              placeholder="Leave blank to use subject default"
              value={question.negativeMarksPerQuestion}
              onChange={(event) =>
                onQuestionChange(question.clientId, {
                  negativeMarksPerQuestion: event.target.value === "" ? "" : parseFloat(event.target.value),
                })
              }
            />
          </div>
        </div>

        {question.questionType === "multiple" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase">Multiple Choice Marking Mode</label>
            <select
              value={question.multipleCorrectScoringMode || "full_only"}
              onChange={(event) =>
                onQuestionChange(question.clientId, {
                  multipleCorrectScoringMode: event.target.value as MultipleCorrectScoringMode,
                })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="full_only">Full Only</option>
              <option value="partial_positive">Partial Positive</option>
              <option value="partial_with_negative">Partial With Negative</option>
              <option value="no_negative_multiple">No Negative Multiple</option>
            </select>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              {question.multipleCorrectScoringMode === "partial_positive" &&
                "Subset of only correct options gets proportional positive marks; any wrong option gets negative marking."}
              {question.multipleCorrectScoringMode === "partial_with_negative" &&
                "Correct picks add proportional marks and wrong picks subtract penalty, with floor limited to the question's negative marks."}
              {(question.multipleCorrectScoringMode || "full_only") === "full_only" &&
                "Only exact match gets full marks; any other attempted answer gets negative marking."}
              {question.multipleCorrectScoringMode === "no_negative_multiple" &&
                "Correct subsets get proportional positive marks, but wrong combinations do not get negative marks."}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase">Question Text</label>
          <BufferedRichTextEditor
            value={question.question}
            onCommit={(value) => onQuestionChange(question.clientId, { question: value })}
            placeholder="Paste or type the question here. Use the Math button for integrals, fractions, differentiation, and other formulas."
            className="shadow-sm"
          />

          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id={`q-img-${question.clientId}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImageUpload(question.clientId, "question", file);
              }}
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor={`q-img-${question.clientId}`} className="cursor-pointer">
                <ImagePlus className="mr-2 h-4 w-4" /> {question.questionImage ? "Change Image" : "Add Image"}
              </label>
            </Button>
            {question.questionImage && <img src={question.questionImage} alt="Preview" className="h-20 rounded border object-contain" loading="lazy" />}
          </div>
        </div>

        {question.questionType === "written" ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase">Correct Written Answer</label>
            <BufferedRichTextEditor
              value={question.writtenAnswer || ""}
              onCommit={(value) => onQuestionChange(question.clientId, { writtenAnswer: value })}
              placeholder="Type the expected written answer here. Use bold, underline, italics, or Math for formulas."
              className="shadow-sm"
              editorClassName="min-h-[88px]"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase">
                {question.questionType === "multiple" ? "Options and Correct Selections" : "Options and Correct Answer"}
              </label>
              <Button type="button" variant="outline" size="sm" onClick={() => onAddOption(question.clientId)}>
                <Plus className="mr-2 h-4 w-4" /> Add Option
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <OptionEditor
                  key={option._id || option.clientId}
                  questionClientId={question.clientId}
                  questionType={question.questionType}
                  option={option}
                  optionIndex={optionIndex}
                  isSelected={question.questionType === "multiple" ? question.correctAnswers.includes(optionIndex) : question.correctAnswer === optionIndex}
                  canRemove={question.options.length > 2}
                  onToggleCorrectAnswer={onToggleCorrectAnswer}
                  onRemoveOption={onRemoveOption}
                  onUpdateOptionText={onUpdateOptionText}
                  onImageUpload={onImageUpload}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t pt-2">
          <label className="text-xs font-semibold uppercase">Explanation (Optional)</label>
          <BufferedRichTextEditor
            value={question.explanation || ""}
            onCommit={(value) => onQuestionChange(question.clientId, { explanation: value })}
            placeholder="Paste or type the explanation here. Use the Math button for formulas and symbolic steps."
            className="shadow-sm"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id={`exp-img-${question.clientId}`}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImageUpload(question.clientId, "explanation", file);
              }}
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor={`exp-img-${question.clientId}`} className="cursor-pointer">
                <ImagePlus className="mr-2 h-4 w-4" />
                {question.explanationImage ? "Change Solution Image" : "Add Solution Image"}
              </label>
            </Button>
            {question.explanationImage && (
              <>
                <img src={question.explanationImage} alt="Explanation preview" className="h-20 rounded border object-contain" loading="lazy" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => onQuestionChange(question.clientId, { explanationImage: "" })}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Remove Image
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const QuestionEditor = () => {
  const { testId } = useParams<{ testId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [dirtyQuestionIds, setDirtyQuestionIds] = useState<Record<string, true>>({});
  const [saveProgress, setSaveProgress] = useState<SaveProgressState>({ current: 0, total: 0, failed: [] });
  const latestQuestionsRef = useRef<Question[]>(questions);
  const latestDirtyQuestionIdsRef = useRef<Record<string, true>>(dirtyQuestionIds);

  latestQuestionsRef.current = questions;
  latestDirtyQuestionIdsRef.current = dirtyQuestionIds;

  useEffect(() => {
    let isCancelled = false;

    const fetchEditorData = async () => {
      setLoading(true);
      try {
        const [questionsResponse, testInfoResponse] = await Promise.all([
          api.get(`/admin/tests/${testId}/questions`),
          api.get(`/tests/${testId}`),
        ]);

        if (isCancelled) return;

        const subjects = (testInfoResponse.data.subjects?.length ? testInfoResponse.data.subjects : [testInfoResponse.data.subject]).filter(Boolean);
        setAvailableSubjects(subjects);
        setQuestions((questionsResponse.data || []).map((question: Question) => normalizeQuestion(question, subjects[0] || "")));
        setDirtyQuestionIds({});
      } catch (error) {
        if (!isCancelled) toast({ title: "Failed to load editor data", variant: "destructive" });
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void fetchEditorData();
    return () => {
      isCancelled = true;
    };
  }, [testId]);

  const addSavingIds = useCallback((questionClientIds: string[]) => {
    setSavingIds((current) => Array.from(new Set([...current, ...questionClientIds])));
  }, []);

  const removeSavingIds = useCallback((questionClientIds: string[]) => {
    const idSet = new Set(questionClientIds);
    setSavingIds((current) => current.filter((clientId) => !idSet.has(clientId)));
  }, []);

  const markQuestionDirty = useCallback((questionClientId: string) => {
    setDirtyQuestionIds((current) => (current[questionClientId] ? current : { ...current, [questionClientId]: true }));
  }, []);

  const clearQuestionDirtyFlags = useCallback((questionClientIds: string[]) => {
    if (questionClientIds.length === 0) return;

    setDirtyQuestionIds((current) => {
      let hasChanges = false;
      const next = { ...current };

      questionClientIds.forEach((clientId) => {
        if (!next[clientId]) return;
        hasChanges = true;
        delete next[clientId];
      });

      return hasChanges ? next : current;
    });
  }, []);

  const handleAddQuestion = useCallback(() => {
    const nextQuestion = createEmptyQuestion(availableSubjects[0] || "");
    setQuestions((current) => [...current, nextQuestion]);
    markQuestionDirty(nextQuestion.clientId);
  }, [availableSubjects, markQuestionDirty]);

  const updateQuestion = useCallback((questionClientId: string, updates: Partial<Question>) => {
    setQuestions((current) =>
      current.map((question) => (question.clientId === questionClientId ? { ...question, ...updates } : question)),
    );
    markQuestionDirty(questionClientId);
  }, [markQuestionDirty]);

  const updateQuestionType = useCallback((questionClientId: string, questionType: QuestionType) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.clientId !== questionClientId) return question;
        if (questionType === "written") {
          return {
            ...question,
            questionType,
            options: [],
            correctAnswer: -1,
            correctAnswers: [],
            writtenAnswer: question.writtenAnswer || "",
            multipleCorrectScoringMode: "full_only",
          };
        }

        const nextCorrectAnswer = question.correctAnswers[0] ?? question.correctAnswer ?? 0;
        return {
          ...question,
          questionType,
          options: question.options.length ? question.options : defaultOptions(),
          correctAnswer: nextCorrectAnswer >= 0 ? nextCorrectAnswer : 0,
          correctAnswers: questionType === "multiple" ? question.correctAnswers : [nextCorrectAnswer >= 0 ? nextCorrectAnswer : 0],
          writtenAnswer: "",
          multipleCorrectScoringMode: questionType === "multiple" ? question.multipleCorrectScoringMode || "full_only" : "full_only",
        };
      }),
    );
    markQuestionDirty(questionClientId);
  }, [markQuestionDirty]);

  const addOption = useCallback((questionClientId: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.clientId === questionClientId ? { ...question, options: [...question.options, emptyOption()] } : question,
      ),
    );
    markQuestionDirty(questionClientId);
  }, [markQuestionDirty]);

  const updateOptionText = useCallback((questionClientId: string, optionClientId: string, text: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.clientId === questionClientId
          ? {
              ...question,
              options: question.options.map((option) => (option.clientId === optionClientId ? { ...option, text } : option)),
            }
          : question,
      ),
    );
    markQuestionDirty(questionClientId);
  }, [markQuestionDirty]);

  const removeOption = useCallback((questionClientId: string, optionClientId: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.clientId !== questionClientId) return question;
        const optionIndex = question.options.findIndex((option) => option.clientId === optionClientId);
        if (optionIndex < 0) return question;

        return {
          ...question,
          options: question.options.filter((option) => option.clientId !== optionClientId),
          correctAnswers: question.correctAnswers
            .filter((answer) => answer !== optionIndex)
            .map((answer) => (answer > optionIndex ? answer - 1 : answer)),
          correctAnswer:
            question.correctAnswer === optionIndex ? 0 : question.correctAnswer > optionIndex ? question.correctAnswer - 1 : question.correctAnswer,
        };
      }),
    );
    markQuestionDirty(questionClientId);
  }, [markQuestionDirty]);

  const toggleCorrectAnswer = useCallback((questionClientId: string, optionIndex: number) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.clientId !== questionClientId) return question;
        if (question.questionType === "multiple") {
          const exists = question.correctAnswers.includes(optionIndex);
          return {
            ...question,
            correctAnswers: exists ? question.correctAnswers.filter((answer) => answer !== optionIndex) : [...question.correctAnswers, optionIndex].sort((a, b) => a - b),
          };
        }

        return { ...question, correctAnswer: optionIndex, correctAnswers: [optionIndex] };
      }),
    );
    markQuestionDirty(questionClientId);
  }, [markQuestionDirty]);

  const handleImageUpload = useCallback(async (questionClientId: string, type: ImageUploadTarget, file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = data.url;

      setQuestions((current) =>
        current.map((question) => {
          if (question.clientId !== questionClientId) return question;
          if (type === "question") return { ...question, questionImage: url };
          if (type === "explanation") return { ...question, explanationImage: url };

          return {
            ...question,
            options: question.options.map((option) => (option.clientId === type.optionClientId ? { ...option, imageUrl: url } : option)),
          };
        }),
      );

      markQuestionDirty(questionClientId);
      toast({ title: "Image uploaded" });
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  }, [markQuestionDirty]);

  const applySavedQuestion = useCallback((questionClientId: string, savedQuestion: Partial<Question>) => {
    setQuestions((current) =>
      current.map((currentQuestion) =>
        currentQuestion.clientId === questionClientId
          ? normalizeQuestion({ ...savedQuestion, clientId: questionClientId }, currentQuestion.subject || availableSubjects[0] || "")
          : currentQuestion,
      ),
    );
  }, [availableSubjects]);

  const persistQuestionSnapshot = useCallback(async (question: Question) => {
    const { data } = await api.post(`/admin/tests/${testId}/questions`, serializeQuestion(question));
    return data;
  }, [testId]);

  const persistBatchSnapshot = useCallback(async (questionBatch: Question[]) => {
    const { data } = await api.post(`/admin/tests/${testId}/questions/batch`, {
      questions: questionBatch.map((question) => ({ clientId: question.clientId, ...serializeQuestion(question) })),
    });
    return data;
  }, [testId]);

  const flushBufferedEditors = useCallback(async () => {
    window.dispatchEvent(new Event(FLUSH_EDITOR_EVENT));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }, []);

  const saveQuestion = useCallback(async (questionClientId: string) => {
    await flushBufferedEditors();

    const latestQuestions = latestQuestionsRef.current;
    const latestDirtyIds = latestDirtyQuestionIdsRef.current;
    const question = latestQuestions.find((item) => item.clientId === questionClientId);
    if (!question) return;
    if (question._id && !latestDirtyIds[questionClientId]) {
      toast({ title: "No unsaved changes" });
      return;
    }

    addSavingIds([questionClientId]);
    try {
      const savedQuestion = await persistQuestionSnapshot(question);
      applySavedQuestion(questionClientId, savedQuestion);
      clearQuestionDirtyFlags([questionClientId]);
      toast({ title: "Question saved" });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      removeSavingIds([questionClientId]);
    }
  }, [addSavingIds, applySavedQuestion, clearQuestionDirtyFlags, flushBufferedEditors, persistQuestionSnapshot, removeSavingIds]);

  const pendingQuestions = useMemo(
    () => questions.filter((question) => !question._id || dirtyQuestionIds[question.clientId]),
    [dirtyQuestionIds, questions],
  );

  const saveProgressValue = useMemo(() => {
    if (!saveProgress.total) return 0;
    return Math.round((saveProgress.current / saveProgress.total) * 100);
  }, [saveProgress.current, saveProgress.total]);

  const saveAllQuestions = useCallback(async () => {
    await flushBufferedEditors();

    const latestPendingQuestions = latestQuestionsRef.current.filter(
      (question) => !question._id || latestDirtyQuestionIdsRef.current[question.clientId],
    );

    if (latestPendingQuestions.length === 0) {
      toast({ title: "No unsaved changes" });
      return;
    }

    setIsSavingAll(true);
    setSaveProgress({ current: 0, total: latestPendingQuestions.length, failed: [] });

    let successCount = 0;
    const failedIds: string[] = [];

    for (const questionChunk of chunkArray(latestPendingQuestions, SAVE_BATCH_SIZE)) {
      const chunkIds = questionChunk.map((question) => question.clientId);
      addSavingIds(chunkIds);

      try {
        const saveResults: Array<{ clientId: string; question?: Partial<Question>; success: boolean }> = [];

        try {
          const batchResponse = await persistBatchSnapshot(questionChunk);
          const resultMap = new Map<string, Partial<Question>>(
            (batchResponse.results || []).map((entry: { clientId: string; question: Partial<Question> }) => [entry.clientId, entry.question]),
          );

          questionChunk.forEach((question) => {
            const savedQuestion = resultMap.get(question.clientId);
            saveResults.push({ clientId: question.clientId, question: savedQuestion, success: Boolean(savedQuestion) });
          });
        } catch (batchError) {
          for (const fallbackChunk of chunkArray(questionChunk, SAVE_FALLBACK_PARALLEL_SIZE)) {
            const fallbackResults = await Promise.allSettled(
              fallbackChunk.map(async (question) => ({ clientId: question.clientId, question: await persistQuestionSnapshot(question) })),
            );

            fallbackResults.forEach((result, index) => {
              saveResults.push(
                result.status === "fulfilled"
                  ? { clientId: result.value.clientId, question: result.value.question, success: true }
                  : { clientId: fallbackChunk[index].clientId, success: false },
              );
            });
          }
        }

        const savedIds: string[] = [];
        saveResults.forEach((result) => {
          if (!result.success || !result.question) {
            failedIds.push(result.clientId);
            return;
          }
          applySavedQuestion(result.clientId, result.question);
          savedIds.push(result.clientId);
          successCount += 1;
        });

        clearQuestionDirtyFlags(savedIds);
        setSaveProgress({ current: successCount + failedIds.length, total: latestPendingQuestions.length, failed: [...failedIds] });
      } finally {
        removeSavingIds(chunkIds);
      }
    }

    setIsSavingAll(false);
    if (failedIds.length === 0) {
      toast({ title: `All ${successCount} question${successCount === 1 ? "" : "s"} saved successfully` });
      return;
    }

    toast({
      title: `${successCount} question${successCount === 1 ? "" : "s"} saved, ${failedIds.length} failed`,
      variant: "destructive",
    });
  }, [addSavingIds, applySavedQuestion, clearQuestionDirtyFlags, flushBufferedEditors, persistBatchSnapshot, persistQuestionSnapshot, removeSavingIds]);

  const deleteQuestion = useCallback(async (questionClientId: string) => {
    const question = questions.find((item) => item.clientId === questionClientId);
    if (!question) return;
    if (!confirm("Remove this question?")) return;

    if (!question._id) {
      setQuestions((current) => current.filter((item) => item.clientId !== questionClientId));
      clearQuestionDirtyFlags([questionClientId]);
      return;
    }

    setDeletingId(question._id || questionClientId);
    try {
      await api.delete(`/admin/tests/${testId}/questions/${question._id}`);
      setQuestions((current) => current.filter((item) => item.clientId !== questionClientId));
      clearQuestionDirtyFlags([questionClientId]);
      toast({ title: "Question deleted" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }, [clearQuestionDirtyFlags, questions, testId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Link to="/">
            <Button variant="outline"><Home className="mr-2 h-4 w-4" /> Home</Button>
          </Link>
          <Link to="/admin/tests">
            <Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-right">
            <h1 className="text-2xl font-bold">Edit Questions</h1>
            <p className="text-xs text-muted-foreground">
              {pendingQuestions.length} unsaved question{pendingQuestions.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button onClick={() => void saveAllQuestions()} disabled={isSavingAll || savingIds.length > 0}>
            {isSavingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All
          </Button>
        </div>
      </div>

      {isSavingAll && saveProgress.total > 0 && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Saving {saveProgress.current}/{saveProgress.total}</span>
            <span>{saveProgressValue}%</span>
          </div>
          <Progress value={saveProgressValue} className="h-2" />
          {saveProgress.failed.length > 0 && (
            <p className="text-xs text-destructive">
              {saveProgress.failed.length} question{saveProgress.failed.length === 1 ? "" : "s"} failed in this pass.
            </p>
          )}
        </div>
      )}

      {questions.map((question, questionIndex) => (
        <QuestionCard
          key={question._id || question.clientId}
          question={question}
          questionIndex={questionIndex}
          availableSubjects={availableSubjects}
          isSaving={savingIds.includes(question.clientId)}
          isDeleting={deletingId === (question._id || question.clientId)}
          isSavingAll={isSavingAll}
          isDirty={!question._id || Boolean(dirtyQuestionIds[question.clientId])}
          onSave={(questionClientId) => void saveQuestion(questionClientId)}
          onDelete={(questionClientId) => void deleteQuestion(questionClientId)}
          onQuestionChange={updateQuestion}
          onQuestionTypeChange={updateQuestionType}
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onToggleCorrectAnswer={toggleCorrectAnswer}
          onUpdateOptionText={updateOptionText}
          onImageUpload={handleImageUpload}
        />
      ))}

      <Button
        variant="link"
        className="flex h-20 w-full items-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground hover:bg-accent/10"
        onClick={handleAddQuestion}
        disabled={isSavingAll}
      >
        <PlusCircle className="h-6 w-6" /> Add New Question
      </Button>
    </div>
  );
};

export default QuestionEditor;
