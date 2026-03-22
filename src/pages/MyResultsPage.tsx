import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Clock, CheckCircle2, ArrowLeft, Trophy, FileText, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import api from "@/services/api";

interface ApiAttempt {
  _id: string;
  status: string;
  score: number;
  totalQuestions: number;
  testTitle: string;
  startedAt: string;
  completedAt?: string;
}

export default function MyResultsPage() {
  const [apiAttempts, setApiAttempts] = useState<ApiAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const { data } = await api.get("/tests/my-attempts");
        setApiAttempts(data || []);
      } catch {
        setApiAttempts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, []);

  const completedAttempts = apiAttempts.filter((a) => a.status === "COMPLETED");
  const totalTests = completedAttempts.length;

  const avgAccuracy =
    totalTests > 0
      ? Math.round(
          completedAttempts.reduce((acc, a) => {
            const total = a.totalQuestions || 1;
            return acc + (a.score / total) * 100;
          }, 0) / totalTests
        )
      : 0;

  const avgScore =
    totalTests > 0
      ? Math.round(
          completedAttempts.reduce((acc, a) => acc + a.score, 0) / totalTests
        )
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12 max-w-4xl">

        <Link
          to="/exams"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Exams
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Results</h1>
          <p className="text-muted-foreground mt-1">All your past test attempts in one place</p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : totalTests}</p>
            <p className="text-xs text-muted-foreground">Tests Taken</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : `${avgAccuracy}%`}</p>
            <p className="text-xs text-muted-foreground">Avg Accuracy</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : avgScore}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : totalTests === 0 ? (
          <div className="text-center py-20 rounded-xl border border-border bg-card">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground">No tests taken yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Start a mock test to see your results here
            </p>
            <Link
              to="/exams"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Browse Exams →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Your Tests
            </h2>
            {completedAttempts.map((attempt, i) => {
              const accuracy =
                attempt.totalQuestions > 0
                  ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                  : 0;
              const date = new Date(attempt.startedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              });

              return (
                <motion.div
                  key={attempt._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-foreground capitalize">
                        {attempt.testTitle !== "Practice Test"
                          ? attempt.testTitle
                          : String(attempt._id).replace(/-/g, " ")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {date}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      accuracy >= 70
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : accuracy >= 40
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {accuracy}% accuracy
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="text-center bg-muted/50 rounded-lg py-2">
                      <p className="text-sm font-bold text-foreground">{attempt.score}</p>
                      <p className="text-[10px] text-muted-foreground">Score</p>
                    </div>
                    <div className="text-center bg-muted/50 rounded-lg py-2">
                      <p className="text-sm font-bold text-foreground">{attempt.totalQuestions}</p>
                      <p className="text-[10px] text-muted-foreground">Questions</p>
                    </div>
                    <div className="text-center bg-muted/50 rounded-lg py-2">
                      <p className="text-sm font-bold text-foreground">{accuracy}%</p>
                      <p className="text-[10px] text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                  {/* View detailed review if localStorage result exists */}
                  {localStorage.getItem(`result_${attempt.testTitle}`) && (
                    <div className="mt-3">
                      <Link
                        to={`/results/${attempt.testTitle}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View detailed review →
                      </Link>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}