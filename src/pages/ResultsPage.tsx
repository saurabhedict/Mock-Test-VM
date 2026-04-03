import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import api from '@/services/api';
import { readApiErrorMessage } from '@/lib/apiError';
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
} from '@/lib/scoring';
import {
  reorderQuestionUsingSavedOptions,
  type BaseTestQuestion,
  type DisplayTestQuestion,
} from '@/lib/testRandomization';
import type { TestAnalysis } from '@/types/ai';

type Question = DisplayTestQuestion;

interface ResultData {
  testId: string;
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

function RingCard({
  label,
  value,
  from,
  to,
}: {
  label: string;
  value: number;
  from: string;
  to: string;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));

  return (
    <motion.div
      whileHover={{ y: -4, rotateX: 3, rotateY: -3 }}
      className="ai-glass-panel rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
    >
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">{label}</div>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
            <defs>
              <linearGradient id={`ring-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={from} />
                <stop offset="100%" stopColor={to} />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={`url(#ring-${label})`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-display font-semibold text-white">{Math.round(progress)}%</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Live</div>
          </div>
        </div>
        <p className="text-sm leading-7 text-white/60">AI uses this signal to shape the study report and coaching prompts.</p>
      </div>
    </motion.div>
  );
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

  useEffect(() => {
    let cancelled = false;

    const hydrateLatestQuestionData = async () => {
      try {
        const { data } = await api.get(`/tests/${testId}`);
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
          };

          localStorage.setItem(`result_${testId}`, JSON.stringify(nextResult));
          return nextResult;
        });
      } catch {
        // Keep local result if fetch fails.
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
  const accuracy = summary.correct + summary.wrong > 0 ? Math.round((summary.correct / (summary.correct + summary.wrong)) * 100) : 0;
  const attempted = questions.length - summary.unanswered;
  const completion = questions.length > 0 ? Math.round((attempted / questions.length) * 100) : 0;
  const avgTime = questions.length > 0 ? Math.round(result.timeTaken / questions.length) : 0;

  const subjectScores: Record<string, { correct: number; total: number; attempted: number }> = {};
  questions.forEach((question, index) => {
    const subject = question.subject || 'General';
    if (!subjectScores[subject]) subjectScores[subject] = { correct: 0, total: 0, attempted: 0 };
    subjectScores[subject].total += 1;
    const answer = answers[index];
    if (!isAnswered(question, answer)) return;
    subjectScores[subject].attempted += 1;
    if (isCorrectAnswer(question, answer)) subjectScores[subject].correct += 1;
  });

  const analyticsBars =
    analysis?.topicWisePerformance?.length
      ? analysis.topicWisePerformance.map((item) => ({
          label: item.topic,
          accuracy: item.accuracy,
          detail: `${item.correct}/${item.total} correct`,
        }))
      : Object.entries(subjectScores).map(([label, data]) => ({
          label,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
          detail: `${data.correct}/${data.total} correct`,
        }));

  const heatmap = questions.map((question, index) => {
    const answer = answers[index];
    const score = getQuestionScore(question, answer, subjectRules);
    const answered = isAnswered(question, answer);
    const correct = isCorrectAnswer(question, answer);
    let tone = 'linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))';
    let label = 'Open';
    if (answered && correct) {
      tone = 'linear-gradient(135deg,rgba(0,229,255,0.28),rgba(138,43,226,0.16))';
      label = 'Lock';
    } else if (answered && score.score > 0) {
      tone = 'linear-gradient(135deg,rgba(255,122,24,0.3),rgba(138,43,226,0.14))';
      label = 'Part';
    } else if (answered) {
      tone = 'linear-gradient(135deg,rgba(255,90,90,0.3),rgba(255,122,24,0.12))';
      label = 'Miss';
    }
    return {
      order: index + 1,
      tone,
      label,
      timeSpentSeconds: result.perQuestionTimes?.[index] || analysis?.questionBreakdown.find((item) => item.order === index + 1)?.timeSpentSeconds || 0,
    };
  });

  const speedValue = avgTime > 0 ? Math.max(0, Math.min(100, Math.round((1 - Math.min(avgTime, 180) / 180) * 100))) : 0;
  const gaugeRotation = -110 + (speedValue / 100) * 220;

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
      try {
        const { data } = await api.post('/analyze-test', {
          questions: result.questions,
          answers: result.answers,
          timeTaken: result.timeTaken,
          perQuestionTimes: result.perQuestionTimes || [],
        });
        setAnalysis(data.analysis);
      } catch (fallbackError) {
        toast.error(readApiErrorMessage(fallbackError, 'AI analysis failed'));
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

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
                  Turn this attempt into a study report
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
                  Futuristic insights for topic accuracy, speed control, and next-step coaching.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    onClick={runAiAnalysis}
                    disabled={analysisLoading}
                    className="ai-glow-button h-14 rounded-2xl border-0 bg-[linear-gradient(135deg,#ff7a18,#ff9a3d_44%,#8a2be2_96%)] px-7 text-base font-semibold text-white hover:brightness-110"
                  >
                    {analysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {analysis ? 'Refresh Analysis' : 'Analyze Test'}
                  </Button>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/68">
                    AI coach is ready for question-by-question help once analysis is generated.
                  </div>
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

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <RingCard label="Accuracy Pulse" value={accuracy} from="#00e5ff" to="#8a2be2" />
                <RingCard label="Completion Pulse" value={completion} from="#ff7a18" to="#8a2be2" />
              </div>

              <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Analytics Preview</div>
                    <h2 className="mt-2 text-2xl font-display font-semibold text-white">Topic field</h2>
                  </div>
                  <BarChart3 className="h-5 w-5 text-[#00e5ff]" />
                </div>
                <div className="space-y-4">
                  {analyticsBars.slice(0, 6).map((item, index) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white">{item.label}</div>
                          <div className="text-xs text-white/48">{item.detail}</div>
                        </div>
                        <div className="text-sm font-semibold text-[#8defff]">{item.accuracy}%</div>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(6, Math.min(100, item.accuracy))}%` }}
                          transition={{ duration: 0.75, delay: index * 0.08 }}
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(255,122,24,0.95),rgba(138,43,226,0.9) 55%,rgba(0,229,255,0.92))]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {analysis?.strongTopics?.length || analysis?.weakTopics?.length ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Strong Topics</div>
                      <div className="flex flex-wrap gap-2">
                        {analysis?.strongTopics?.length ? analysis.strongTopics.map((topic) => (
                          <span key={topic} className="rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/10 px-3 py-1.5 text-xs font-medium text-[#9cecff]">{topic}</span>
                        )) : <span className="text-sm text-white/50">No strong-topic signal yet.</span>}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Weak Topics</div>
                      <div className="flex flex-wrap gap-2">
                        {analysis?.weakTopics?.length ? analysis.weakTopics.map((topic) => (
                          <span key={topic} className="rounded-full border border-[#ff7a18]/20 bg-[#ff7a18]/10 px-3 py-1.5 text-xs font-medium text-[#ffc38d]">{topic}</span>
                        )) : <span className="text-sm text-white/50">No weak-topic signal yet.</span>}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Speed Meter</div>
                    <h2 className="mt-2 text-2xl font-display font-semibold text-white">Response velocity</h2>
                  </div>
                  <Zap className="h-5 w-5 text-[#ff7a18]" />
                </div>
                <div className="relative mx-auto flex h-60 max-w-sm items-center justify-center">
                  <div className="absolute inset-x-8 bottom-7 h-40 rounded-t-full border border-white/10 border-b-0 bg-white/[0.03]" />
                  <motion.div
                    className="absolute bottom-10 h-24 w-1 rounded-full origin-bottom bg-[linear-gradient(180deg,#ffffff,#00e5ff,#8a2be2)] shadow-[0_0_20px_rgba(0,229,255,0.35)]"
                    initial={{ rotate: '-110deg' }}
                    animate={{ rotate: `${gaugeRotation}deg` }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                  />
                  <div className="absolute bottom-8 h-5 w-5 rounded-full bg-white shadow-[0_0_28px_rgba(255,255,255,0.45)]" />
                  <div className="relative z-10 text-center">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">Speed Index</div>
                    <div className="mt-3 text-5xl font-display font-semibold text-white">{speedValue}</div>
                    <div className="mt-2 text-sm text-white/56">{avgTime}s average per question</div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Slow Signal</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {analysis?.timeAnalysis?.slowQuestions?.[0] ? `Q${analysis.timeAnalysis.slowQuestions[0].order} • ${analysis.timeAnalysis.slowQuestions[0].timeSpentSeconds}s` : 'Run analysis'}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Fast Signal</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {analysis?.timeAnalysis?.fastQuestions?.[0] ? `Q${analysis.timeAnalysis.fastQuestions[0].order} • ${analysis.timeAnalysis.fastQuestions[0].timeSpentSeconds}s` : 'Waiting for timing map'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Question Heatmap</div>
                    <h2 className="mt-2 text-2xl font-display font-semibold text-white">Attempt intensity</h2>
                  </div>
                  <Activity className="h-5 w-5 text-[#00e5ff]" />
                </div>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 xl:grid-cols-7">
                  {heatmap.map((cell) => (
                    <div key={cell.order} className="rounded-[22px] border border-white/10 px-3 py-4 text-center" style={{ background: cell.tone }}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Q{cell.order}</div>
                      <div className="mt-3 text-sm font-semibold text-white">{cell.label}</div>
                      <div className="mt-2 text-[11px] text-white/50">{cell.timeSpentSeconds ? `${cell.timeSpentSeconds}s` : 'No time'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">AI Narrative</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-white">Study report layer</h2>
                </div>
                <Brain className="h-5 w-5 text-[#8a2be2]" />
              </div>
              {analysisLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="ai-shimmer-track rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="h-3 w-28 rounded-full bg-white/10" />
                      <div className="mt-4 h-5 rounded-full bg-white/10" />
                      <div className="mt-2 h-5 w-10/12 rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : analysis ? (
                <div className="grid gap-5">
                  <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(138,43,226,0.16),rgba(0,229,255,0.08))] p-5">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Executive Summary</div>
                    <p className="text-sm leading-7 text-white/82">{analysis.aiSummary || 'The AI summary will appear here after analysis.'}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Suggestions</div>
                      <div className="space-y-2.5">
                        {analysis.improvementSuggestions.length ? analysis.improvementSuggestions.map((suggestion) => (
                          <div key={suggestion} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm leading-6 text-white/76">{suggestion}</div>
                        )) : <div className="text-sm text-white/50">No suggestions yet.</div>}
                      </div>
                    </div>
                    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Difficulty Radar</div>
                      <div className="space-y-3">
                        {analysis.difficultyPerformance.length ? analysis.difficultyPerformance.map((difficulty) => (
                          <div key={difficulty.difficulty}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="font-medium capitalize text-white">{difficulty.difficulty}</span>
                              <span className="text-white/52">{difficulty.accuracy}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/[0.06]">
                              <div className="h-full rounded-full bg-[linear-gradient(90deg,#00e5ff,#8a2be2,#ff7a18)]" style={{ width: `${Math.max(6, Math.min(100, difficulty.accuracy))}%` }} />
                            </div>
                          </div>
                        )) : <div className="text-sm text-white/50">Difficulty split will appear after analysis.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[26px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm leading-7 text-white/58">
                  Run the AI analysis to unlock topic diagnosis, timing signals, and smarter coaching prompts.
                </div>
              )}
            </div>

            <div className="ai-glass-panel rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Attempt Snapshot</div>
                  <h2 className="mt-2 text-2xl font-display font-semibold text-white">Performance constellation</h2>
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
              <div className="mt-5 space-y-3">
                {Object.entries(subjectScores).slice(0, 5).map(([subject, data]) => {
                  const score = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                  return (
                    <div key={subject} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-white">{subject}</span>
                        <span className="text-white/52">{data.correct}/{data.total}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a18,#8a2be2,#00e5ff)]" style={{ width: `${Math.max(6, Math.min(100, score))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <StudentAiChatPanel questions={questions} answers={answers} />
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
                  {questions.map((question, index) => {
                    const userAnswer = answers[index];
                    const answeredCorrectly = isCorrectAnswer(question, userAnswer);
                    const unansweredQuestion = !isAnswered(question, userAnswer);
                    const scoreInfo = getQuestionScore(question, userAnswer, subjectRules);
                    const aiQuestion = analysis?.questionBreakdown.find((item) => item.questionId === question.id || item.order === index + 1);

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

                            {aiQuestion ? (
                              <div className="rounded-[24px] border border-[#8a2be2]/18 bg-[linear-gradient(135deg,rgba(138,43,226,0.18),rgba(0,229,255,0.08))] p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                                  <Brain className="h-4 w-4 text-[#9cecff]" />
                                  AI Solution Guide
                                </div>
                                {aiQuestion.solutionSteps.length ? <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-white/80">{aiQuestion.solutionSteps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
                                {aiQuestion.simpleExplanation ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78">{aiQuestion.simpleExplanation}</p> : null}
                              </div>
                            ) : null}
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
