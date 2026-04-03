import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import api from '@/services/api';
import FormattedContent from '@/components/FormattedContent';
import IntrinsicImage from '@/components/IntrinsicImage';
import StudentAiChatPanel from '@/components/StudentAiChatPanel';
import {
  calculateScoreSummary,
  getQuestionMarking,
  getQuestionScore,
  isAnswered,
  isCorrectAnswer,
  type AnswerValue,
  type ExamSubjectMarkingRule,
} from '@/lib/scoring';
import {
  reorderQuestionUsingSavedOptions,
  type BaseTestQuestion,
  type DisplayTestQuestion,
} from '@/lib/testRandomization';

type Question = DisplayTestQuestion;

interface ResultData {
  testId: string;
  attemptId?: string | null;
  answers: Record<string, AnswerValue>;
  questions: Question[];
  timeTaken: number;
  perQuestionTimes?: number[];
  subjects?: ExamSubjectMarkingRule[];
  optionOrderByQuestionId?: Record<string, number[]>;
  submissionStatus?: 'COMPLETED' | 'AUTO_SUBMITTED';
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

const particles = [
  { left: '9%', top: '18%', delay: 0 },
  { left: '24%', top: '72%', delay: 0.5 },
  { left: '41%', top: '27%', delay: 1.1 },
  { left: '58%', top: '78%', delay: 1.7 },
  { left: '74%', top: '22%', delay: 0.3 },
  { left: '88%', top: '62%', delay: 1.2 },
];

const formatTime = (seconds = 0) => {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (!mins) return `${secs}s`;
  if (!secs) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

const optionText = (option: any) => (typeof option === 'string' ? option : option?.text || '');

export default function ResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const [showReview, setShowReview] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const raw = localStorage.getItem(`result_${testId}`);
  if (!raw) {
    return (
      <div className="dark min-h-screen ai-dashboard-shell text-white">
        <Header />
        <div className="container py-24 text-center">
          <h1 className="text-3xl font-display font-semibold text-white">No results found</h1>
          <Link to="/exams" className="mt-4 inline-block text-sm text-[#8defff] hover:text-white">
            Back to Exams
          </Link>
        </div>
      </div>
    );
  }

  const [result, setResult] = useState<ResultData>(() => JSON.parse(raw));
  const [reviewState, setReviewState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;

    const hydrateLatestQuestionData = async () => {
      setReviewState('loading');

      try {
        const { data } = await api.get(`/tests/${testId}/review`, {
          params: result.attemptId ? { attemptId: result.attemptId } : undefined,
        });
        const latestQuestions = new Map(
          (data.questions || []).map((question: Question & { _id?: string }) => [question._id || question.id, question]),
        );

        if (cancelled) return;

        setResult((current) => {
          const mergedQuestions = current.questions.map((question) => {
            const latest = latestQuestions.get(question.id);
            if (!latest) return question;

            const reorderedLatest = reorderQuestionUsingSavedOptions(
              {
                id: latest._id || latest.id,
                question: latest.question,
                questionType: latest.questionType || 'single',
                questionImage: latest.questionImage,
                options: latest.options || [],
                correctAnswer: latest.correctAnswer,
                correctAnswers: latest.correctAnswers || [],
                writtenAnswer: latest.writtenAnswer || '',
                subject: latest.subject,
                explanation: latest.explanation || '',
                explanationImage: latest.explanationImage,
                marksPerQuestion: latest.marksPerQuestion ?? question.marksPerQuestion,
                negativeMarksPerQuestion: latest.negativeMarksPerQuestion ?? question.negativeMarksPerQuestion,
                multipleCorrectScoringMode: latest.multipleCorrectScoringMode || 'full_only',
              } as BaseTestQuestion,
              current.optionOrderByQuestionId?.[question.id],
              question.originalQuestionIndex,
            );

            return {
              ...question,
              question: reorderedLatest.question,
              questionType: reorderedLatest.questionType,
              questionImage: reorderedLatest.questionImage ?? question.questionImage,
              options: reorderedLatest.options.length ? reorderedLatest.options : question.options,
              correctAnswer: reorderedLatest.correctAnswer ?? question.correctAnswer,
              correctAnswers: reorderedLatest.correctAnswers?.length ? reorderedLatest.correctAnswers : question.correctAnswers,
              writtenAnswer: reorderedLatest.writtenAnswer ?? question.writtenAnswer,
              subject: reorderedLatest.subject || question.subject,
              explanation: reorderedLatest.explanation ?? question.explanation,
              explanationImage: reorderedLatest.explanationImage ?? question.explanationImage,
              marksPerQuestion: reorderedLatest.marksPerQuestion ?? question.marksPerQuestion,
              negativeMarksPerQuestion: reorderedLatest.negativeMarksPerQuestion ?? question.negativeMarksPerQuestion,
              multipleCorrectScoringMode: reorderedLatest.multipleCorrectScoringMode ?? question.multipleCorrectScoringMode,
            };
          });

          const nextResult = {
            ...current,
            questions: mergedQuestions,
            subjects: data.examDetails?.subjects || current.subjects,
            attemptId: data.attempt?._id || current.attemptId,
            submissionStatus: data.attempt?.status || current.submissionStatus,
            autoSubmitReason: data.attempt?.terminationReason || current.autoSubmitReason,
          };

          localStorage.setItem(`result_${testId}`, JSON.stringify(nextResult));
          return nextResult;
        });
        setReviewState('ready');
      } catch {
        if (cancelled) return;
        setReviewState('unavailable');
      }
    };

    void hydrateLatestQuestionData();
    return () => {
      cancelled = true;
    };
  }, [result.attemptId, testId]);

  const { questions, answers } = result;
  const subjectRules = result.subjects || [];
  const summary = result.summary || calculateScoreSummary(questions, answers, subjectRules);
  const reviewReady = reviewState === 'ready';
  const accuracy = summary.correct + summary.wrong > 0 ? Math.round((summary.correct / (summary.correct + summary.wrong)) * 100) : 0;
  const attempted = questions.length - summary.unanswered;
  const completion = questions.length > 0 ? Math.round((attempted / questions.length) * 100) : 0;
  const avgTime = questions.length > 0 ? Math.round(result.timeTaken / questions.length) : 0;

  const subjectScores: Record<string, { correct: number; total: number; attempted: number }> = {};
  if (reviewReady) {
    questions.forEach((question, index) => {
      const subject = question.subject || 'General';
      if (!subjectScores[subject]) subjectScores[subject] = { correct: 0, total: 0, attempted: 0 };
      subjectScores[subject].total += 1;
      const answer = answers[index];
      if (!isAnswered(question, answer)) return;
      subjectScores[subject].attempted += 1;
      if (isCorrectAnswer(question, answer)) subjectScores[subject].correct += 1;
    });
  }

  const subjectPerformance = reviewReady
    ? Object.entries(subjectScores)
        .map(([subject, data]) => ({
          subject,
          correct: data.correct,
          total: data.total,
          attempted: data.attempted,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        }))
        .sort((left, right) => right.total - left.total)
    : [];

  return (
    <div className="dark min-h-screen ai-dashboard-shell text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ai-grid-bg absolute inset-0 opacity-20" />
        <div className="ai-noise-overlay absolute inset-0" />
        <div className="absolute left-[8%] top-[-8%] h-80 w-80 rounded-full bg-[#ff7a18]/14 blur-3xl" />
        <div className="absolute right-[10%] top-[8%] h-80 w-80 rounded-full bg-[#8a2be2]/14 blur-3xl" />
        <div className="absolute bottom-[10%] left-[28%] h-96 w-96 rounded-full bg-[#00e5ff]/10 blur-3xl" />
        {particles.map((particle) => (
          <motion.span
            key={`${particle.left}-${particle.top}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-white/55"
            style={{ left: particle.left, top: particle.top }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.85, 0.2] }}
            transition={{ duration: 5.2, repeat: Infinity, delay: particle.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <Header />

      <main className="relative z-10">
        <div className="container max-w-7xl py-8 md:py-12">
          <Link to="/exams" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/68 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Exams
          </Link>

          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="ai-glass-panel rounded-[36px] border border-white/10 px-6 py-7 md:px-8 md:py-9">
            <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00e5ff] animate-[ai-pulse_1.6s_ease-in-out_infinite]" />
                  Student AI Analysis
                </div>
                <h1 className="text-4xl font-display font-semibold leading-tight text-white md:text-5xl">
                  Your result is ready
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
                  Check your score, review your answers, and ask AI any doubt in one simple place.
                </p>
                <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/68">
                  The AI box below already knows your test answers, correct answers, explanations, and timing. Just ask your doubt directly.
                </div>
                {result.submissionStatus === 'AUTO_SUBMITTED' ? (
                  <div className="mt-6 rounded-[24px] border border-[#ff7a18]/18 bg-[linear-gradient(135deg,rgba(255,122,24,0.14),rgba(255,255,255,0.04))] px-4 py-4 text-sm text-[#ffd4b0]">
                    <strong className="font-semibold text-white">Auto-submitted attempt.</strong>{' '}
                    {result.autoSubmitReason || 'A monitored exam rule was triggered during the attempt.'}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Score', value: `${summary.score}/${summary.totalMarks}`, sub: 'Net marks', icon: Target },
                  { label: 'Accuracy', value: `${accuracy}%`, sub: 'Precision', icon: CheckCircle2 },
                  { label: 'Completion', value: `${completion}%`, sub: `${attempted}/${questions.length} attempted`, icon: Activity },
                  { label: 'Time', value: formatTime(result.timeTaken), sub: `${avgTime}s avg pace`, icon: Clock3 },
                ].map((item, index) => (
                  <motion.div key={item.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="ai-glass-panel rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/38">Live</div>
                    </div>
                    <div className="text-2xl font-display font-semibold text-white">{item.value}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/42">{item.label}</div>
                    <p className="mt-3 text-sm text-white/58">{item.sub}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Attempt Snapshot</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-white">Performance summary</h2>
                </div>
                <Target className="h-5 w-5 text-[#ff7a18]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Correct', value: summary.correct, icon: CheckCircle2, tone: 'text-[#8defff]' },
                  { label: 'Wrong', value: summary.wrong, icon: XCircle, tone: 'text-[#ffb8b8]' },
                  { label: 'Partial', value: summary.partial, icon: Sparkles, tone: 'text-[#ffc38d]' },
                  { label: 'Open', value: summary.unanswered, icon: Clock3, tone: 'text-white/72' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <item.icon className={`h-5 w-5 ${item.tone}`} />
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/38">{item.label}</div>
                    </div>
                    <div className="text-3xl font-display font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">
                <div><strong className="text-white">Accuracy:</strong> {accuracy}%</div>
                <div><strong className="text-white">Completion:</strong> {completion}%</div>
                <div><strong className="text-white">Average time per question:</strong> {avgTime}s</div>
              </div>
            </div>

            <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Subject Performance</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-white">Where you did well and where to improve</h2>
                </div>
                <Activity className="h-5 w-5 text-[#00e5ff]" />
              </div>
              <div className="space-y-4">
                {reviewState === 'loading' ? (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-white/58">
                    Detailed subject-wise review is loading.
                  </div>
                ) : reviewState === 'unavailable' ? (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-white/58">
                    Detailed subject-wise review is not available right now. Please refresh once more.
                  </div>
                ) : subjectPerformance.length > 0 ? subjectPerformance.map((item) => (
                  <div key={item.subject} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{item.subject}</div>
                        <div className="text-xs text-white/48">{item.correct}/{item.total} correct • {item.attempted}/{item.total} attempted</div>
                      </div>
                      <div className="text-sm font-semibold text-[#8defff]">{item.accuracy}%</div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a18,#8a2be2,#00e5ff)]" style={{ width: `${Math.max(6, Math.min(100, item.accuracy))}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-white/58">
                    Subject-wise performance will appear here when the test includes subject data.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8">
            {reviewReady ? (
              <StudentAiChatPanel
                questions={questions}
                answers={answers}
                summary={summary}
                timeTaken={result.timeTaken}
                perQuestionTimes={result.perQuestionTimes || []}
              />
            ) : (
              <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">AI Help</div>
                <h2 className="mt-2 text-2xl font-display font-semibold text-white">Preparing your review data</h2>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  The AI box will unlock as soon as we load your completed paper, answers, explanations, and timing details.
                </p>
              </div>
            )}
          </section>

          <section className="mt-8">
            <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Answer Review</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-white">Question debrief</h2>
                </div>
                <Button variant="outline" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08] hover:text-white" onClick={() => setShowReview((current) => !current)}>
                  {showReview ? 'Hide Review' : 'Show Review'}
                  {showReview ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {showReview ? (
                <div className="mt-6 space-y-4">
                  {reviewState === 'loading' ? (
                    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-white/58">
                      Loading your full answer review.
                    </div>
                  ) : reviewState === 'unavailable' ? (
                    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-white/58">
                      We could not load the full answer review yet. Please refresh and try again.
                    </div>
                  ) : questions.map((question, index) => {
                    const userAnswer = answers[index];
                    const answeredCorrectly = isCorrectAnswer(question, userAnswer);
                    const unansweredQuestion = !isAnswered(question, userAnswer);
                    const scoreInfo = getQuestionScore(question, userAnswer, subjectRules);

                    let badge = 'Open';
                    let badgeClass = 'border-white/10 bg-white/[0.05] text-white/70';
                    if (!unansweredQuestion && answeredCorrectly) {
                      badge = 'Correct';
                      badgeClass = 'border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[#9cecff]';
                    } else if (!unansweredQuestion && scoreInfo.score > 0) {
                      badge = 'Partial';
                      badgeClass = 'border-[#ff7a18]/20 bg-[#ff7a18]/10 text-[#ffc38d]';
                    } else if (!unansweredQuestion) {
                      badge = 'Wrong';
                      badgeClass = 'border-[#ff8f8f]/20 bg-[#ff5a5a]/10 text-[#ffb8b8]';
                    }

                    return (
                      <div key={index} className="rounded-[28px] border border-white/10 bg-black/20 p-4">
                        <button className="w-full text-left" onClick={() => setExpandedQ(expandedQ === index ? null : index)}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
                                {index + 1}
                              </div>
                              <div>
                                <div className={`mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}>{badge}</div>
                                <FormattedContent html={question.question} className="text-sm leading-7 text-white/82" />
                                {question.questionImage ? <img src={question.questionImage} alt="Question" className="mt-3 max-h-48 rounded-2xl border border-white/10" /> : null}
                              </div>
                            </div>
                            {expandedQ === index ? <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-white/48" /> : <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-white/48" />}
                          </div>
                        </button>

                        {expandedQ === index ? (
                          <div className="mt-5 space-y-4 md:ml-14">
                            {question.questionType === 'written' ? (
                              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-white/74">
                                <div><strong className="text-white">Your answer:</strong> {typeof userAnswer === 'string' && userAnswer.trim() ? userAnswer : 'Not answered'}</div>
                                <div className="mt-3">
                                  <strong className="text-white">Correct answer:</strong>
                                  {question.writtenAnswer?.trim() ? <FormattedContent html={question.writtenAnswer} className="mt-2 text-sm text-white/82" /> : <span className="ml-2 text-white/48">-</span>}
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-3">
                                {question.options.map((option, optionIndex) => {
                                  const optionImage = typeof option === 'string' ? null : option.imageUrl;
                                  const isCorrectOption = question.questionType === 'multiple' ? (question.correctAnswers || []).includes(optionIndex) : optionIndex === question.correctAnswer;
                                  const isUserChoice = question.questionType === 'multiple' ? Array.isArray(userAnswer) && userAnswer.includes(optionIndex) : optionIndex === userAnswer;
                                  const optionClass = isCorrectOption ? 'border-[#00e5ff]/20 bg-[#00e5ff]/10 text-white' : isUserChoice && !answeredCorrectly ? 'border-[#ff8f8f]/20 bg-[#ff5a5a]/10 text-white' : 'border-white/10 bg-white/[0.04] text-white/62';
                                  return (
                                    <div key={optionIndex} className={`rounded-[22px] border px-4 py-3 ${optionClass}`}>
                                      <div className="mb-2 font-semibold text-white">{String.fromCharCode(65 + optionIndex)}.</div>
                                      <FormattedContent html={optionText(option)} className="text-sm leading-7 text-current" />
                                      {optionImage ? <IntrinsicImage src={optionImage} alt="Option" loading="lazy" trimWhitespace className="mt-3 border border-white/10" /> : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/56">
                              {(() => {
                                const { positiveMarks, negativeMarks } = getQuestionMarking(question, subjectRules);
                                const questionScore = getQuestionScore(question, userAnswer, subjectRules);
                                const mode = question.questionType === 'multiple' ? ` • Mode: ${(question.multipleCorrectScoringMode || 'full_only').replace(/_/g, ' ')}` : '';
                                return `Marking: +${positiveMarks} correct, -${negativeMarks} wrong${mode} • Score earned: ${questionScore.score}`;
                              })()}
                            </div>

                            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,122,24,0.06))] p-4">
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Official Explanation</div>
                              <FormattedContent html={question.explanation} className="text-sm leading-7 text-white/78" />
                              {question.explanationImage ? <img src={question.explanationImage} alt="Solution explanation" className="mt-4 max-h-80 w-auto rounded-2xl border border-white/10 bg-white" /> : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
