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

type QuestionOption = string | { text?: string; imageUrl?: string };

const optionText = (option: QuestionOption) => (typeof option === 'string' ? option : option?.text || '');

export default function ResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const [showReview, setShowReview] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const raw = localStorage.getItem(`result_${testId}`);
  const [result, setResult] = useState<ResultData | null>(() => {
    if (!raw) return null;

    try {
      return JSON.parse(raw) as ResultData;
    } catch {
      return null;
    }
  });
  const [reviewState, setReviewState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (!testId || !result) {
      setReviewState('unavailable');
      return;
    }

    let cancelled = false;

    const hydrateLatestQuestionData = async () => {
      setReviewState('loading');

      try {
        const { data } = await api.get(`/tests/${testId}/review`, {
          params: result.attemptId ? { attemptId: result.attemptId } : undefined,
        });
        const latestQuestions = new Map(
          (data.questions || []).map((question: Question & { _id?: string }) => [String(question._id || question.id || ''), question]),
        );

        if (cancelled) return;

        setResult((current) => {
          const mergedQuestions = current.questions.map((question) => {
            const latest = latestQuestions.get(question.id);
            if (!latest) return question;

            const reorderedLatest = reorderQuestionUsingSavedOptions(
              {
                id: String(latest._id || latest.id || ''),
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
            attemptId: data.attempt?._id ? String(data.attempt._id) : current.attemptId,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, result?.attemptId]);

  if (!result) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, hsl(30 60% 98%), hsl(24 90% 94%), hsl(35 70% 96%))' }}>
        <Header />
        <div className="container py-24 text-center">
          <h1 className="text-3xl font-display font-semibold text-[#231C17]">No results found</h1>
          <Link to="/exams" className="mt-4 inline-block text-sm text-[#E8722A] hover:text-[#D4621E]">
            Back to Exams
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, hsl(30 60% 98%), hsl(24 90% 94%), hsl(35 70% 96%))' }}>
      <Header />

      <main className="relative z-10">
        <div className="container max-w-7xl py-8 md:py-12">
          <Link to="/exams" className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#EAE4DE] bg-white px-4 py-2 text-sm text-[#7A716A] hover:text-[#E8722A] hover:border-[#E8722A]/30 transition-colors shadow-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Exams
          </Link>

          {/* Hero Section */}
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-[#EAE4DE] px-6 py-7 md:px-8 md:py-9" style={{ background: 'linear-gradient(180deg, #FFFFFF, #FFF9F5)', boxShadow: '0 4px 24px -6px rgba(30,20,12,0.08)' }}>
            <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8722A]/20 bg-[#FFF0E5] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#E8722A]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E8722A] animate-[ai-pulse_1.6s_ease-in-out_infinite]" />
                  Student AI Analysis
                </div>
                <h1 className="text-4xl font-display font-semibold leading-tight text-[#231C17] md:text-5xl">
                  Your result is ready
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[#7A716A] md:text-lg">
                  Check your score, review your answers, and ask AI any doubt in one simple place.
                </p>
                <div className="mt-7 rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] px-4 py-3 text-sm text-[#7A716A]">
                  The AI box below already knows your test answers, correct answers, explanations, and timing. Just ask your doubt directly.
                </div>
                {result.submissionStatus === 'AUTO_SUBMITTED' ? (
                  <div className="mt-6 rounded-3xl border border-[#E8722A]/20 bg-[#FFF0E5] px-4 py-4 text-sm text-[#9A5A2A]">
                    <strong className="font-semibold text-[#231C17]">Auto-submitted attempt.</strong>{' '}
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
                  <motion.div key={item.label} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="rounded-3xl border border-[#EAE4DE] bg-white p-5" style={{ boxShadow: '0 2px 12px -4px rgba(30,20,12,0.06)' }}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EAE4DE] bg-[#FFF0E5]">
                        <item.icon className="h-5 w-5 text-[#E8722A]" />
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-[#7A716A]/50">Live</div>
                    </div>
                    <div className="text-2xl font-display font-semibold text-[#231C17]">{item.value}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#7A716A]/60">{item.label}</div>
                    <p className="mt-3 text-sm text-[#7A716A]">{item.sub}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Performance + Subject section */}
          <section className="mt-8 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            {/* Performance Summary Card */}
            <div className="rounded-3xl border border-[#EAE4DE] bg-white p-6" style={{ boxShadow: '0 4px 24px -6px rgba(30,20,12,0.08)' }}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7A716A]/60">Attempt Snapshot</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-[#231C17]">Performance summary</h2>
                </div>
                <Target className="h-5 w-5 text-[#E8722A]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Correct', value: summary.correct, icon: CheckCircle2, tone: 'text-[#22C55E]', bgTone: 'bg-[#F0FDF4]' },
                  { label: 'Wrong', value: summary.wrong, icon: XCircle, tone: 'text-[#EF4444]', bgTone: 'bg-[#FEF2F2]' },
                  { label: 'Partial', value: summary.partial, icon: Sparkles, tone: 'text-[#E8722A]', bgTone: 'bg-[#FFF0E5]' },
                  { label: 'Open', value: summary.unanswered, icon: Clock3, tone: 'text-[#7A716A]', bgTone: 'bg-[#F3EDE7]' },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl border border-[#EAE4DE] ${item.bgTone} p-4`}>
                    <div className="mb-3 flex items-center justify-between">
                      <item.icon className={`h-5 w-5 ${item.tone}`} />
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[#7A716A]/50">{item.label}</div>
                    </div>
                    <div className="text-3xl font-display font-semibold text-[#231C17]">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] p-4 text-sm leading-7 text-[#7A716A]">
                <div><strong className="text-[#231C17]">Accuracy:</strong> {accuracy}%</div>
                <div><strong className="text-[#231C17]">Completion:</strong> {completion}%</div>
                <div><strong className="text-[#231C17]">Average time per question:</strong> {avgTime}s</div>
              </div>
            </div>

            {/* Subject Performance Card */}
            <div className="rounded-3xl border border-[#EAE4DE] bg-white p-6" style={{ boxShadow: '0 4px 24px -6px rgba(30,20,12,0.08)' }}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7A716A]/60">Subject Performance</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-[#231C17]">Where you did well and where to improve</h2>
                </div>
                <Activity className="h-5 w-5 text-[#E8722A]" />
              </div>
              <div className="space-y-4">
                {reviewState === 'loading' ? (
                  <div className="rounded-2xl border border-dashed border-[#EAE4DE] bg-[#FAF5F0] p-6 text-sm text-[#7A716A]">
                    Detailed subject-wise review is loading.
                  </div>
                ) : reviewState === 'unavailable' ? (
                  <div className="rounded-2xl border border-dashed border-[#EAE4DE] bg-[#FAF5F0] p-6 text-sm text-[#7A716A]">
                    Detailed subject-wise review is not available right now. Please refresh once more.
                  </div>
                ) : subjectPerformance.length > 0 ? subjectPerformance.map((item) => (
                  <div key={item.subject} className="rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#231C17]">{item.subject}</div>
                        <div className="text-xs text-[#7A716A]">{item.correct}/{item.total} correct • {item.attempted}/{item.total} attempted</div>
                      </div>
                      <div className="text-sm font-semibold text-[#E8722A]">{item.accuracy}%</div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#EAE4DE]">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(6, Math.min(100, item.accuracy))}%`, background: 'linear-gradient(90deg, #E8722A, #F4A261)' }} />
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-[#EAE4DE] bg-[#FAF5F0] p-6 text-sm text-[#7A716A]">
                    Subject-wise performance will appear here when the test includes subject data.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* AI Chat Section */}
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
              <div className="rounded-3xl border border-[#EAE4DE] bg-white p-6" style={{ boxShadow: '0 4px 24px -6px rgba(30,20,12,0.08)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7A716A]/60">VidyaSaathi</div>
                <h2 className="mt-2 text-2xl font-display font-semibold text-[#231C17]">Preparing your review data</h2>
                <p className="mt-3 text-sm leading-7 text-[#7A716A]">
                  The AI box will unlock as soon as we load your completed paper, answers, explanations, and timing details.
                </p>
              </div>
            )}
          </section>

          {/* Question Review Section */}
          <section className="mt-8">
            <div className="rounded-3xl border border-[#EAE4DE] bg-white p-6" style={{ boxShadow: '0 4px 24px -6px rgba(30,20,12,0.08)' }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7A716A]/60">Answer Review</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-[#231C17]">Question debrief</h2>
                </div>
                <Button variant="outline" className="h-12 rounded-2xl border-[#EAE4DE] bg-[#FAF5F0] px-5 text-[#231C17] hover:bg-[#FFF0E5] hover:text-[#E8722A] hover:border-[#E8722A]/30 transition-colors" onClick={() => setShowReview((current) => !current)}>
                  {showReview ? 'Hide Review' : 'Show Review'}
                  {showReview ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {showReview ? (
                <div className="mt-6 space-y-4">
                  {reviewState === 'loading' ? (
                    <div className="rounded-2xl border border-dashed border-[#EAE4DE] bg-[#FAF5F0] p-6 text-sm text-[#7A716A]">
                      Loading your full answer review.
                    </div>
                  ) : reviewState === 'unavailable' ? (
                    <div className="rounded-2xl border border-dashed border-[#EAE4DE] bg-[#FAF5F0] p-6 text-sm text-[#7A716A]">
                      We could not load the full answer review yet. Please refresh and try again.
                    </div>
                  ) : questions.map((question, index) => {
                    const userAnswer = answers[index];
                    const answeredCorrectly = isCorrectAnswer(question, userAnswer);
                    const unansweredQuestion = !isAnswered(question, userAnswer);
                    const scoreInfo = getQuestionScore(question, userAnswer, subjectRules);

                    let badge = 'Open';
                    let badgeClass = 'border-[#EAE4DE] bg-[#F3EDE7] text-[#7A716A]';
                    if (!unansweredQuestion && answeredCorrectly) {
                      badge = 'Correct';
                      badgeClass = 'border-[#22C55E]/20 bg-[#F0FDF4] text-[#16A34A]';
                    } else if (!unansweredQuestion && scoreInfo.score > 0) {
                      badge = 'Partial';
                      badgeClass = 'border-[#E8722A]/20 bg-[#FFF0E5] text-[#E8722A]';
                    } else if (!unansweredQuestion) {
                      badge = 'Wrong';
                      badgeClass = 'border-[#EF4444]/20 bg-[#FEF2F2] text-[#EF4444]';
                    }

                    return (
                      <div key={index} className="rounded-2xl border border-[#EAE4DE] bg-[#FAF5F0] p-4">
                        <button className="w-full text-left" onClick={() => setExpandedQ(expandedQ === index ? null : index)}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#EAE4DE] bg-white text-sm font-semibold text-[#231C17]">
                                {index + 1}
                              </div>
                              <div>
                                <div className={`mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}>{badge}</div>
                                <FormattedContent html={question.question} className="text-sm leading-7 text-[#231C17]" />
                                {question.questionImage ? <img src={question.questionImage} alt="Question" className="mt-3 max-h-48 rounded-2xl border border-[#EAE4DE]" /> : null}
                              </div>
                            </div>
                            {expandedQ === index ? <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-[#7A716A]" /> : <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-[#7A716A]" />}
                          </div>
                        </button>

                        {expandedQ === index ? (
                          <div className="mt-5 space-y-4 md:ml-14">
                            {question.questionType === 'written' ? (
                              <div className="rounded-2xl border border-[#EAE4DE] bg-white p-4 text-sm leading-7 text-[#231C17]">
                                <div><strong className="text-[#231C17]">Your answer:</strong> {typeof userAnswer === 'string' && userAnswer.trim() ? userAnswer : 'Not answered'}</div>
                                <div className="mt-3">
                                  <strong className="text-[#231C17]">Correct answer:</strong>
                                  {question.writtenAnswer?.trim() ? <FormattedContent html={question.writtenAnswer} className="mt-2 text-sm text-[#231C17]" /> : <span className="ml-2 text-[#7A716A]">-</span>}
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-3">
                                {question.options.map((option, optionIndex) => {
                                  const optionImage = typeof option === 'string' ? null : option.imageUrl;
                                  const isCorrectOption = question.questionType === 'multiple' ? (question.correctAnswers || []).includes(optionIndex) : optionIndex === question.correctAnswer;
                                  const isUserChoice = question.questionType === 'multiple' ? Array.isArray(userAnswer) && userAnswer.includes(optionIndex) : optionIndex === userAnswer;
                                  const optionClass = isCorrectOption ? 'border-[#22C55E]/30 bg-[#F0FDF4] text-[#231C17]' : isUserChoice && !answeredCorrectly ? 'border-[#EF4444]/30 bg-[#FEF2F2] text-[#231C17]' : 'border-[#EAE4DE] bg-white text-[#231C17]/70';
                                  return (
                                    <div key={optionIndex} className={`rounded-2xl border px-4 py-3 ${optionClass}`}>
                                      <div className="mb-2 font-semibold text-[#231C17]">{String.fromCharCode(65 + optionIndex)}.</div>
                                      <FormattedContent html={optionText(option)} className="text-sm leading-7 text-current" />
                                      {optionImage ? <IntrinsicImage src={optionImage} alt="Option" loading="lazy" trimWhitespace className="mt-3 border border-[#EAE4DE]" /> : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="rounded-2xl border border-[#EAE4DE] bg-[#F3EDE7] px-4 py-3 text-xs text-[#7A716A]">
                              {(() => {
                                const { positiveMarks, negativeMarks } = getQuestionMarking(question, subjectRules);
                                const questionScore = getQuestionScore(question, userAnswer, subjectRules);
                                const mode = question.questionType === 'multiple' ? ` • Mode: ${(question.multipleCorrectScoringMode || 'full_only').replace(/_/g, ' ')}` : '';
                                return `Marking: +${positiveMarks} correct, -${negativeMarks} wrong${mode} • Score earned: ${questionScore.score}`;
                              })()}
                            </div>

                            <div className="rounded-2xl border border-[#EAE4DE] bg-[#FFF7F0] p-4">
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E8722A]">Official Explanation</div>
                              <FormattedContent html={question.explanation} className="text-sm leading-7 text-[#231C17]" />
                              {question.explanationImage ? <img src={question.explanationImage} alt="Solution explanation" className="mt-4 max-h-80 w-auto rounded-2xl border border-[#EAE4DE] bg-white" /> : null}
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
