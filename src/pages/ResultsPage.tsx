import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, BarChart3, Target, Clock, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { Question } from '@/data/questions';

interface ResultData {
  testId: string;
  answers: Record<string, number | null>;
  questions: Question[];
  timeTaken: number;
}

export default function ResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const [showReview, setShowReview] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

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

  const result: ResultData = JSON.parse(raw);
  const { questions, answers } = result;

  let correct = 0, wrong = 0, unanswered = 0;
  const subjectScores: Record<string, { correct: number; total: number; attempted: number }> = {};

  questions.forEach((q, i) => {
    const sub = q.subject;
    if (!subjectScores[sub]) subjectScores[sub] = { correct: 0, total: 0, attempted: 0 };
    subjectScores[sub].total++;

    const ans = answers[i];
    if (ans === null || ans === undefined) {
      unanswered++;
    } else if (ans === q.correctAnswer) {
      correct++;
      subjectScores[sub].correct++;
      subjectScores[sub].attempted++;
    } else {
      wrong++;
      subjectScores[sub].attempted++;
    }
  });

  // Calculate marks considering MHTCET scoring
  const parts = (testId || '').split('-');
  const subjectOrType = parts[1];
  let totalMarks = 0;
  let scoredMarks = 0;

  questions.forEach((q, i) => {
    const marksPerQ = (subjectOrType === 'maths' || (subjectOrType === 'pcm' && q.subject === 'Mathematics')) ? 2 : 1;
    totalMarks += marksPerQ;
    const ans = answers[i];
    if (ans !== null && ans !== undefined && ans === q.correctAnswer) {
      scoredMarks += marksPerQ;
    }
  });

  const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
  const timeMins = Math.floor(result.timeTaken / 60);

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

        {/* Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Score', value: `${scoredMarks}/${totalMarks}`, icon: Target, color: 'text-primary' },
            { label: 'Correct', value: correct, icon: CheckCircle2, color: 'text-status-answered' },
            { label: 'Wrong', value: wrong, icon: XCircle, color: 'text-status-not-answered' },
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

        {/* Additional stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">Unanswered</div>
            <div className="text-xl font-bold text-foreground">{unanswered}</div>
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

        {/* Subject-wise breakdown */}
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
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review section */}
        <div className="mb-10">
          <Button variant="outline" className="gap-2" onClick={() => setShowReview(!showReview)}>
            {showReview ? 'Hide' : 'Show'} Answer Review
            {showReview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showReview && (
            <div className="mt-4 space-y-3">
              {questions.map((q, i) => {
                const userAns = answers[i];
                const isCorrect = userAns === q.correctAnswer;
                const isUnanswered = userAns === null || userAns === undefined;

                return (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground ${
                            isUnanswered ? 'bg-muted text-muted-foreground' : isCorrect ? 'bg-status-answered' : 'bg-status-not-answered'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-sm text-foreground">{q.question}</span>
                        </div>
                        {expandedQ === i ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      </div>
                    </button>

                    {expandedQ === i && (
                      <div className="mt-3 ml-9 space-y-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`rounded-lg px-3 py-2 text-sm ${
                            oi === q.correctAnswer ? 'bg-status-answered/10 text-foreground border border-status-answered/30' :
                            oi === userAns && !isCorrect ? 'bg-status-not-answered/10 text-foreground border border-status-not-answered/30' :
                            'bg-muted/50 text-muted-foreground'
                          }`}>
                            <span className="font-medium">{String.fromCharCode(65 + oi)}.</span> {opt}
                            {oi === q.correctAnswer && <span className="ml-2 text-xs font-medium text-status-answered">✓ Correct</span>}
                            {oi === userAns && !isCorrect && <span className="ml-2 text-xs font-medium text-status-not-answered">✗ Your answer</span>}
                          </div>
                        ))}
                        <div className="mt-2 rounded-lg bg-accent p-3 text-xs text-accent-foreground">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
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
