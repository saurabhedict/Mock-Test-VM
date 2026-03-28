import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, BarChart3, Target, Clock, ArrowLeft, ChevronDown, ChevronUp, Brain, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import api from '@/services/api';
import FormattedContent from '@/components/FormattedContent';
import IntrinsicImage from '@/components/IntrinsicImage';
import StudentAiChatPanel from '@/components/StudentAiChatPanel';
import { toast } from 'sonner';
import {
  calculateScoreSummary,
  getQuestionMarking,
  getQuestionScore,
  isAnswered,
  isCorrectAnswer,
  type AnswerValue,
  type ExamSubjectMarkingRule,
  type MultipleCorrectScoringMode,
  type QuestionType,
} from '@/lib/scoring';
import type { TestAnalysis } from '@/types/ai';

interface Question {
  id: string;
  question: string;
  questionType?: QuestionType;
  questionImage?: string;
  options: any[];
  correctAnswer: number;
  correctAnswers?: number[];
  writtenAnswer?: string;
  subject: string;
  explanation: string;
  explanationImage?: string;
  marksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
  multipleCorrectScoringMode?: MultipleCorrectScoringMode;
}

interface ResultData {
  testId: string;
  answers: Record<string, AnswerValue>;
  questions: Question[];
  timeTaken: number;
  perQuestionTimes?: number[];
  subjects?: ExamSubjectMarkingRule[];
  submissionStatus?: "COMPLETED" | "AUTO_SUBMITTED";
  autoSubmitReason?: string | null;
  summary?: {
    score: number;
    correct: number;
    partial: number;
    wrong: number;
    unanswered: number;
    totalMarks: number;
  };
}

export default function ResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const [showReview, setShowReview] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<TestAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const raw = localStorage.getItem(`result_${testId}`);
  if (!raw) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">No results found</h1>
          <Link to="/exams" className="mt-4 inline-block text-primary hover:underline">Back to Exams</Link>
        </div>
      </div>
    );
  }

  const [result, setResult] = useState<ResultData>(() => JSON.parse(raw));

  useEffect(() => {
    let cancelled = false;

    const hydrateLatestQuestionData = async () => {
      try {
        const { data } = await api.get(`/tests/${testId}`);
        const latestQuestions = new Map(
          (data.questions || []).map((question: Question & { _id?: string }) => [
            question._id || question.id,
            question,
          ]),
        );

        if (cancelled) return;

        setResult((current) => {
          const mergedQuestions = current.questions.map((question) => {
            const latest = latestQuestions.get(question.id);
            if (!latest) return question;

            return {
              ...question,
              questionImage: latest.questionImage ?? question.questionImage,
              options: latest.options?.length ? latest.options : question.options,
              correctAnswer: latest.correctAnswer ?? question.correctAnswer,
              correctAnswers: latest.correctAnswers?.length ? latest.correctAnswers : question.correctAnswers,
              writtenAnswer: latest.writtenAnswer ?? question.writtenAnswer,
              explanation: latest.explanation ?? question.explanation,
              explanationImage: latest.explanationImage ?? question.explanationImage,
              marksPerQuestion: latest.marksPerQuestion ?? question.marksPerQuestion,
              negativeMarksPerQuestion: latest.negativeMarksPerQuestion ?? question.negativeMarksPerQuestion,
              multipleCorrectScoringMode: latest.multipleCorrectScoringMode ?? question.multipleCorrectScoringMode,
            };
          });

          const nextResult = {
            ...current,
            questions: mergedQuestions,
            subjects: data.examDetails?.subjects || current.subjects,
          };

          localStorage.setItem(`result_${testId}`, JSON.stringify(nextResult));
          return nextResult;
        });
      } catch {
        // Keep the locally saved result if the latest fetch fails.
      }
    };

    hydrateLatestQuestionData();

    return () => {
      cancelled = true;
    };
  }, [testId]);

  const { questions, answers } = result;
  const subjectRules = result.subjects || [];
  const summary = result.summary || calculateScoreSummary(questions, answers, subjectRules);

  const subjectScores: Record<string, { correct: number; total: number; attempted: number }> = {};

  questions.forEach((q, i) => {
    const sub = q.subject;
    if (!subjectScores[sub]) subjectScores[sub] = { correct: 0, total: 0, attempted: 0 };
    subjectScores[sub].total++;

    const ans = answers[i];
    if (!isAnswered(q, ans)) {
    } else if (isCorrectAnswer(q, ans)) {
      subjectScores[sub].correct++;
      subjectScores[sub].attempted++;
    } else {
      subjectScores[sub].attempted++;
    }
  });

  const accuracy = summary.correct + summary.wrong > 0 ? Math.round((summary.correct / (summary.correct + summary.wrong)) * 100) : 0;
  const timeMins = Math.floor(result.timeTaken / 60);

  const runAiAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const { data } = await api.post('/analyze-test', {
        testId,
        answers: result.answers,
        timeTaken: result.timeTaken,
        perQuestionTimes: result.perQuestionTimes || [],
      });
      setAnalysis(data.analysis);
    } catch {
      // Fall back to sending the current result payload if the backend cannot resolve the test.
      try {
        const { data } = await api.post('/analyze-test', {
          questions: result.questions,
          answers: result.answers,
          timeTaken: result.timeTaken,
          perQuestionTimes: result.perQuestionTimes || [],
        });
        setAnalysis(data.analysis);
      } catch {
        toast.error('AI analysis failed');
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12 max-w-4xl">
        <Link to="/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Exams
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-foreground">Test Results</h1>
          <p className="text-muted-foreground mt-1">Here's how you performed</p>
        </motion.div>

        {result.submissionStatus === 'AUTO_SUBMITTED' && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            <strong className="font-semibold">This attempt was auto-submitted.</strong>{' '}
            {result.autoSubmitReason || 'A monitored exam rule was triggered during the attempt.'}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Score', value: `${summary.score}/${summary.totalMarks}`, icon: Target, color: 'text-primary' },
            { label: 'Correct', value: summary.correct, icon: CheckCircle2, color: 'text-status-answered' },
            { label: 'Partial', value: summary.partial, icon: Target, color: 'text-amber-600' },
            { label: 'Wrong', value: summary.wrong, icon: XCircle, color: 'text-status-not-answered' },
            { label: 'Accuracy', value: `${accuracy}%`, icon: BarChart3, color: 'text-primary' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-5 text-center shadow-card"
            >
              <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
              <div className="text-2xl font-display font-bold text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">Unanswered</div>
            <div className="text-xl font-bold text-foreground">{summary.unanswered}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Time Taken</div>
            <div className="text-xl font-bold text-foreground">{timeMins} min</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">Total Questions</div>
            <div className="text-xl font-bold text-foreground">{questions.length}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card mb-10">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Subject-wise Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(subjectScores).map(([subject, data]) => {
              const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              return (
                <div key={subject}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{subject}</span>
                    <span className="text-sm text-muted-foreground">{data.correct}/{data.total} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-emerald-50/60 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Brain className="h-3.5 w-3.5" />
                Student AI Analysis
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Turn this attempt into a study report</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate topic-wise diagnosis, speed analysis, improvement suggestions, and question-by-question solution coaching.
              </p>
            </div>
            <Button onClick={runAiAnalysis} disabled={analysisLoading} className="min-w-52">
              {analysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {analysis ? 'Refresh AI Analysis' : 'Analyze Test'}
            </Button>
          </div>

          {analysis && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-card p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI Summary</div>
                  <p className="mt-3 text-sm leading-7 text-foreground">{analysis.aiSummary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border bg-card p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Strong Topics</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.strongTopics.length > 0 ? analysis.strongTopics.map((topic) => (
                        <span key={topic} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {topic}
                        </span>
                      )) : <span className="text-sm text-muted-foreground">No strong-topic signal yet.</span>}
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-card p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Weak Topics</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.weakTopics.length > 0 ? analysis.weakTopics.map((topic) => (
                        <span key={topic} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          {topic}
                        </span>
                      )) : <span className="text-sm text-muted-foreground">No weak-topic signal yet.</span>}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Topic Accuracy</div>
                  <div className="space-y-3">
                    {analysis.topicWisePerformance.map((topic) => (
                      <div key={topic.topic}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{topic.topic}</span>
                          <span className="text-muted-foreground">{topic.correct}/{topic.total} • {topic.accuracy}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(topic.accuracy, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border bg-card p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Time Analysis</div>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="rounded-xl bg-muted/50 p-3">
                      Average time per question: <strong>{analysis.timeAnalysis.averageTimeSeconds || 0}s</strong>
                    </div>
                    <div>
                      <div className="mb-2 font-medium text-foreground">Slow Questions</div>
                      <div className="space-y-2">
                        {analysis.timeAnalysis.slowQuestions.length > 0 ? analysis.timeAnalysis.slowQuestions.map((question) => (
                          <div key={question.questionId} className="rounded-xl bg-muted/50 p-3 text-xs">
                            <div className="font-semibold text-foreground">Q{question.order} • {question.timeSpentSeconds}s</div>
                            <div className="mt-1 text-muted-foreground">{question.questionPreview}</div>
                          </div>
                        )) : <div className="text-muted-foreground">Per-question timing was not available.</div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Improvement Suggestions</div>
                  <div className="mt-3 space-y-2">
                    {analysis.improvementSuggestions.map((suggestion) => (
                      <div key={suggestion} className="rounded-xl bg-muted/50 p-3 text-sm text-foreground">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-10">
          <StudentAiChatPanel questions={questions} answers={answers} />
        </div>

        <div className="mb-10">
          <Button variant="outline" className="gap-2" onClick={() => setShowReview(!showReview)}>
            {showReview ? 'Hide' : 'Show'} Answer Review
            {showReview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showReview && (
            <div className="mt-4 space-y-3">
              {questions.map((q, i) => {
                const userAns = answers[i];
                const answeredCorrectly = isCorrectAnswer(q, userAns);
                const unansweredQuestion = !isAnswered(q, userAns);
                const aiQuestion = analysis?.questionBreakdown.find((item) => item.questionId === q.id || item.order === i + 1);

                return (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <button className="w-full text-left" onClick={() => setExpandedQ(expandedQ === i ? null : i)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground ${
                            unansweredQuestion ? 'bg-muted text-muted-foreground' : answeredCorrectly ? 'bg-status-answered' : 'bg-status-not-answered'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="space-y-2">
                            <FormattedContent html={q.question} className="text-sm text-foreground" />
                            {q.questionImage && <img src={q.questionImage} alt="Q" className="max-h-40 rounded border shadow-sm" />}
                          </div>
                        </div>
                        {expandedQ === i ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      </div>
                    </button>

                    {expandedQ === i && (
                      <div className="mt-3 ml-9 space-y-2">
                        {q.questionType === 'written' ? (
                          <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            <div><strong>Your answer:</strong> {typeof userAns === 'string' && userAns.trim() ? userAns : 'Not answered'}</div>
                            <div className="mt-2">
                              <strong>Correct answer:</strong>
                              {q.writtenAnswer?.trim() ? (
                                <FormattedContent html={q.writtenAnswer} className="mt-2 text-sm text-foreground" />
                              ) : (
                                <span> -</span>
                              )}
                            </div>
                          </div>
                        ) : q.options.map((option, oi) => {
                          const optText = typeof option === 'string' ? option : option.text;
                          const optImg = typeof option === 'string' ? null : option.imageUrl;
                          const isCorrectOption = q.questionType === 'multiple'
                            ? (q.correctAnswers || []).includes(oi)
                            : oi === q.correctAnswer;
                          const isUserChoice = q.questionType === 'multiple'
                            ? Array.isArray(userAns) && userAns.includes(oi)
                            : oi === userAns;

                          return (
                            <div key={oi} className={`rounded-lg px-3 py-2 text-sm ${
                              isCorrectOption ? 'bg-status-answered/10 text-foreground border border-status-answered/30' :
                              isUserChoice && !answeredCorrectly ? 'bg-status-not-answered/10 text-foreground border border-status-not-answered/30' :
                              'bg-muted/50 text-muted-foreground'
                            }`}>
                              <div className="flex flex-col gap-2">
                                <div className="space-y-1">
                                  <div className="font-bold">{String.fromCharCode(65 + oi)}.</div>
                                  <FormattedContent html={optText} className="text-sm text-current" />
                                  {isCorrectOption && <span className="text-xs font-bold text-status-answered uppercase">Correct</span>}
                                  {isUserChoice && !answeredCorrectly && <span className="text-xs font-bold text-status-not-answered uppercase">Your answer</span>}
                                </div>
                                {optImg && (
                                  <IntrinsicImage
                                    src={optImg}
                                    alt="Opt"
                                    loading="lazy"
                                    trimWhitespace
                                    className="border"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                          {(() => {
                            const { positiveMarks, negativeMarks } = getQuestionMarking(q, subjectRules);
                            const questionScore = getQuestionScore(q, userAns, subjectRules);
                            const modeText =
                              q.questionType === 'multiple'
                                ? ` • Mode: ${(q.multipleCorrectScoringMode || 'full_only').replace(/_/g, ' ')}`
                                : '';
                            return `Marking: +${positiveMarks} for correct, -${negativeMarks} for wrong${modeText} • Score earned: ${questionScore.score}`;
                          })()}
                        </div>
                        <div className="mt-2 rounded-lg bg-accent p-3 text-xs text-accent-foreground">
                          <strong>Explanation:</strong>
                          <FormattedContent html={q.explanation} className="mt-2 text-xs text-accent-foreground" />
                          {q.explanationImage && (
                            <img
                              src={q.explanationImage}
                              alt="Solution explanation"
                              className="mt-3 max-h-80 w-auto rounded-lg border bg-white"
                            />
                          )}
                        </div>
                        {aiQuestion && (
                          <div className="rounded-lg border border-primary/20 bg-primary/[0.05] p-3 text-xs text-foreground">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
                              <Brain className="h-3.5 w-3.5" />
                              AI Solution Guide
                            </div>
                            {aiQuestion.solutionSteps.length > 0 && (
                              <ol className="list-decimal space-y-1 pl-4">
                                {aiQuestion.solutionSteps.map((step) => (
                                  <li key={step}>{step}</li>
                                ))}
                              </ol>
                            )}
                            {aiQuestion.simpleExplanation && (
                              <p className="mt-3 rounded-lg bg-background/70 p-3 leading-6">{aiQuestion.simpleExplanation}</p>
                            )}
                            {aiQuestion.wrongOptionReasons.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {aiQuestion.wrongOptionReasons.map((reason) => (
                                  <div key={`${aiQuestion.questionId}-${reason.optionKey}`} className="rounded-lg bg-background/70 p-3">
                                    <strong>{reason.optionKey}:</strong> {reason.reason}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
