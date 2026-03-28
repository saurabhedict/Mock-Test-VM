import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ImagePlus, Trash, Save, PlusCircle, ArrowLeft, Loader2, Plus, MinusCircle, Home } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import RichTextEditor from "@/components/RichTextEditor";

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

type ImageUploadTarget = "question" | "explanation" | { optionClientId: string };

const createClientId = () =>
  globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const emptyOption = (): QuestionOption => ({ clientId: createClientId(), text: "" });

const defaultOptions = () => [emptyOption(), emptyOption(), emptyOption(), emptyOption()];

const normalizeOptions = (questionType: QuestionType, options?: Array<Partial<QuestionOption>>) => {
  if (questionType === "written") {
    return [];
  }

  if (!options?.length) {
    return defaultOptions();
  }

  return options.map((option) => ({
    _id: option._id,
    clientId: option.clientId || option._id || createClientId(),
    text: option.text || "",
    imageUrl: option.imageUrl,
  }));
};

const normalizeCorrectAnswers = (questionType: QuestionType, question: Partial<Question>) => {
  if (questionType === "written") {
    return [];
  }

  const rawAnswers =
    Array.isArray(question.correctAnswers) && question.correctAnswers.length
      ? question.correctAnswers
      : question.correctAnswer !== undefined
        ? [question.correctAnswer]
        : [0];

  const normalizedAnswers = [...new Set(rawAnswers.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0))];

  if (questionType === "multiple") {
    return normalizedAnswers.sort((a, b) => a - b);
  }

  return [normalizedAnswers[0] ?? 0];
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

const QuestionEditor = () => {
  const { testId } = useParams<{ testId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/tests/${testId}/questions`);
      setQuestions(data.map((question: Question) => normalizeQuestion(question)));
    } catch (error) {
      toast({ title: "Failed to load questions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [testId]);

  const fetchTestInfo = useCallback(async () => {
    try {
      const { data } = await api.get(`/tests/${testId}`);
      const subjects = data.subjects?.length ? data.subjects : [data.subject];
      setAvailableSubjects(subjects.filter(Boolean));
    } catch (error) {
      toast({ title: "Failed to load test details", variant: "destructive" });
    }
  }, [testId]);

  useEffect(() => {
    void fetchQuestions();
    void fetchTestInfo();
  }, [fetchQuestions, fetchTestInfo]);

  useEffect(() => {
    if (!availableSubjects.length) return;

    setQuestions((current) =>
      current.map((question) =>
        question.subject
          ? question
          : {
              ...question,
              subject: availableSubjects[0],
            }
      )
    );
  }, [availableSubjects]);

  const handleAddQuestion = () => {
    setQuestions((current) => [...current, createEmptyQuestion(availableSubjects[0] || "")]);
  };

  const updateQuestion = (questionClientId: string, updates: Partial<Question>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.clientId === questionClientId
          ? {
              ...question,
              ...updates,
            }
          : question
      )
    );
  };

  const updateQuestionType = (questionClientId: string, questionType: QuestionType) => {
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
      })
    );
  };

  const addOption = (questionClientId: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.clientId === questionClientId
          ? {
              ...question,
              options: [...question.options, emptyOption()],
            }
          : question
      )
    );
  };

  const removeOption = (questionClientId: string, optionClientId: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.clientId !== questionClientId) return question;

        const optionIndex = question.options.findIndex((option) => option.clientId === optionClientId);
        if (optionIndex < 0) return question;

        const filteredOptions = question.options.filter((option) => option.clientId !== optionClientId);
        const nextCorrectAnswer =
          question.correctAnswer === optionIndex
            ? 0
            : question.correctAnswer > optionIndex
              ? question.correctAnswer - 1
              : question.correctAnswer;

        return {
          ...question,
          options: filteredOptions,
          correctAnswers: question.correctAnswers
            .filter((answer) => answer !== optionIndex)
            .map((answer) => (answer > optionIndex ? answer - 1 : answer)),
          correctAnswer: nextCorrectAnswer,
        };
      })
    );
  };

  const toggleCorrectAnswer = (questionClientId: string, optionIndex: number) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.clientId !== questionClientId) return question;

        if (question.questionType === "multiple") {
          const exists = question.correctAnswers.includes(optionIndex);
          return {
            ...question,
            correctAnswers: exists
              ? question.correctAnswers.filter((answer) => answer !== optionIndex)
              : [...question.correctAnswers, optionIndex].sort((a, b) => a - b),
          };
        }

        return {
          ...question,
          correctAnswer: optionIndex,
          correctAnswers: [optionIndex],
        };
      })
    );
  };

  const handleImageUpload = async (questionClientId: string, type: ImageUploadTarget, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = data.url;
      setQuestions((current) =>
        current.map((question) => {
          if (question.clientId !== questionClientId) return question;

          if (type === 'question') {
            return { ...question, questionImage: url };
          }

          if (type === 'explanation') {
            return { ...question, explanationImage: url };
          }

          return {
            ...question,
            options: question.options.map((option) =>
              option.clientId === type.optionClientId
                ? {
                    ...option,
                    imageUrl: url,
                  }
                : option
            ),
          };
        })
      );
      toast({ title: "Image uploaded" });
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const saveQuestion = async (questionClientId: string) => {
    const question = questions.find((item) => item.clientId === questionClientId);
    if (!question) return;

    setSavingId(questionClientId);
    try {
      const payload = serializeQuestion(question);
      const { data } = await api.post(`/admin/tests/${testId}/questions`, payload);
      setQuestions((current) =>
        current.map((currentQuestion) =>
          currentQuestion.clientId === questionClientId
            ? normalizeQuestion(
                {
                  ...data,
                  clientId: questionClientId,
                },
                currentQuestion.subject || availableSubjects[0] || ""
              )
            : currentQuestion
        )
      );
      toast({ title: "Question saved" });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const deleteQuestion = async (questionClientId: string) => {
    const question = questions.find((item) => item.clientId === questionClientId);
    if (!question) return;

    const confirmed = confirm("Remove this question?");
    if (!confirmed) return;

    if (!question._id) {
      setQuestions((current) => current.filter((item) => item.clientId !== questionClientId));
      return;
    }

    setDeletingId(question._id || questionClientId);
    try {
      await api.delete(`/admin/tests/${testId}/questions/${question._id}`);
      setQuestions((current) => current.filter((item) => item.clientId !== questionClientId));
      toast({ title: "Question deleted" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Link to="/">
            <Button variant="outline"><Home className="mr-2 h-4 w-4" /> Home</Button>
          </Link>
          <Link to="/admin/tests">
            <Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Edit Questions</h1>
      </div>

      {questions.map((q, qIdx) => (
        <Card key={q._id || q.clientId} className="overflow-hidden shadow-sm border border-border">
          <CardHeader className="bg-muted/50 p-4 border-b flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Question {qIdx + 1}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => saveQuestion(q.clientId)} disabled={savingId === q.clientId}>
                {savingId === q.clientId ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-1" />}
                Save {q._id ? "Update" : "New"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive h-8 w-8 hover:bg-red-50"
                onClick={() => deleteQuestion(q.clientId)}
                disabled={deletingId === (q._id || q.clientId)}
              >
                {deletingId === (q._id || q.clientId) ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {availableSubjects.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase">Subject</label>
                  <select
                    value={q.subject || availableSubjects[0]}
                    onChange={e => updateQuestion(q.clientId, { subject: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {availableSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase">Question Type</label>
                <select
                  value={q.questionType}
                  onChange={e => updateQuestionType(q.clientId, e.target.value as QuestionType)}
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
                  value={q.marksPerQuestion}
                  onChange={e => updateQuestion(q.clientId, { marksPerQuestion: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase">Negative Marks Override</label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="Leave blank to use subject default"
                  value={q.negativeMarksPerQuestion}
                  onChange={e => updateQuestion(q.clientId, { negativeMarksPerQuestion: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                />
              </div>
            </div>

            {q.questionType === "multiple" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase">Multiple Choice Marking Mode</label>
                <select
                  value={q.multipleCorrectScoringMode || "full_only"}
                  onChange={e => updateQuestion(q.clientId, { multipleCorrectScoringMode: e.target.value as MultipleCorrectScoringMode })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="full_only">Full Only</option>
                  <option value="partial_positive">Partial Positive</option>
                  <option value="partial_with_negative">Partial With Negative</option>
                  <option value="no_negative_multiple">No Negative Multiple</option>
                </select>
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  {q.multipleCorrectScoringMode === "partial_positive" && "Subset of only correct options gets proportional positive marks; any wrong option gets negative marking."}
                  {q.multipleCorrectScoringMode === "partial_with_negative" && "Correct picks add proportional marks and wrong picks subtract penalty, with floor limited to the question's negative marks."}
                  {(q.multipleCorrectScoringMode || "full_only") === "full_only" && "Only exact match gets full marks; any other attempted answer gets negative marking."}
                  {q.multipleCorrectScoringMode === "no_negative_multiple" && "Correct subsets get proportional positive marks, but wrong combinations do not get negative marks."}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase">Question Text</label>
              <RichTextEditor
                placeholder="Paste or type the question here. Use the Math button for integrals, fractions, differentiation, and other formulas."
                value={q.question}
                onChange={(value) => updateQuestion(q.clientId, { question: value })}
                className="shadow-sm"
              />
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={`q-img-${q.clientId}`}
                  onChange={e => e.target.files?.[0] && handleImageUpload(q.clientId, 'question', e.target.files[0])}
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor={`q-img-${q.clientId}`} className="cursor-pointer">
                    <ImagePlus className="h-4 w-4 mr-2" /> {q.questionImage ? "Change Image" : "Add Image"}
                  </label>
                </Button>
                {q.questionImage && <img src={q.questionImage} alt="Preview" className="h-20 object-contain rounded border" />}
              </div>
            </div>

            {q.questionType === "written" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase">Correct Written Answer</label>
                <RichTextEditor
                  placeholder="Type the expected written answer here. Use bold, underline, italics, or Math for formulas."
                  value={q.writtenAnswer || ""}
                  onChange={(value) => updateQuestion(q.clientId, { writtenAnswer: value })}
                  className="shadow-sm"
                  editorClassName="min-h-[88px]"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase">
                    {q.questionType === "multiple" ? "Options and Correct Selections" : "Options and Correct Answer"}
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={() => addOption(q.clientId)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Option
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, oIdx) => (
                    <div key={opt._id || opt.clientId} className="space-y-2 p-3 border rounded-lg bg-card/50">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold">Option {oIdx + 1}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type={q.questionType === "multiple" ? "checkbox" : "radio"}
                            name={`correct-${q.clientId}`}
                            checked={q.questionType === "multiple" ? q.correctAnswers.includes(oIdx) : q.correctAnswer === oIdx}
                            onChange={() => toggleCorrectAnswer(q.clientId, oIdx)}
                          />
                          <Button type="button" variant="ghost" size="icon" disabled={q.options.length <= 2} onClick={() => removeOption(q.clientId, opt.clientId)}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <RichTextEditor
                        placeholder={`Paste option ${oIdx + 1} here, or use Math for formulas`}
                        value={opt.text}
                        onChange={(value) => {
                          const next = [...q.options];
                          next[oIdx] = { ...next[oIdx], text: value };
                          updateQuestion(q.clientId, { options: next });
                        }}
                        editorClassName="min-h-[76px]"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`opt-img-${q.clientId}-${opt.clientId}`}
                          onChange={e => e.target.files?.[0] && handleImageUpload(q.clientId, { optionClientId: opt.clientId }, e.target.files[0])}
                        />
                        <button className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors flex items-center">
                          <label htmlFor={`opt-img-${q.clientId}-${opt.clientId}`} className="cursor-pointer flex items-center"><ImagePlus className="h-3 w-3 mr-1" /> Add Image</label>
                        </button>
                        {opt.imageUrl && <img src={opt.imageUrl} alt="Preview" className="h-8 w-8 object-cover rounded border" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-semibold uppercase">Explanation (Optional)</label>
              <RichTextEditor
                placeholder="Paste or type the explanation here. Use the Math button for formulas and symbolic steps."
                value={q.explanation}
                onChange={(value) => updateQuestion(q.clientId, { explanation: value })}
                className="shadow-sm"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={`exp-img-${q.clientId}`}
                  onChange={e => e.target.files?.[0] && handleImageUpload(q.clientId, 'explanation', e.target.files[0])}
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor={`exp-img-${q.clientId}`} className="cursor-pointer">
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {q.explanationImage ? "Change Solution Image" : "Add Solution Image"}
                  </label>
                </Button>
                {q.explanationImage && (
                  <>
                    <img src={q.explanationImage} alt="Explanation preview" className="h-20 object-contain rounded border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => updateQuestion(q.clientId, { explanationImage: "" })}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Remove Image
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="link" className="w-full border-2 border-dashed h-20 text-muted-foreground rounded-xl flex items-center gap-2 hover:bg-accent/10" onClick={handleAddQuestion}>
        <PlusCircle className="h-6 w-6" /> Add New Question
      </Button>
    </div>
  );
};

export default QuestionEditor;
