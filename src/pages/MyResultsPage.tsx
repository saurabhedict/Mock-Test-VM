import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Clock, CheckCircle2, ArrowLeft, Trophy, FileText, Loader2, Brain, TrendingUp, Sparkles, Target } from "lucide-react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, LineChart, Line } from "recharts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import type { Prediction, Recommendations, StudentAnalytics } from "@/types/ai";

interface ApiAttempt {
  _id: string;
  status: string;
  score: number;
  totalQuestions: number;
  totalMarks: number;
  accuracy: number;
  timeTakenSeconds: number;
  testTitle: string;
  startedAt: string;
  completedAt?: string;
}

export default function MyResultsPage() {
  const { user } = useAuth();
  const [apiAttempts, setApiAttempts] = useState<ApiAttempt[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const [attemptsResponse, analyticsResponse, recommendationsResponse, predictionResponse] = await Promise.allSettled([
          api.get("/tests/my-attempts"),
          api.get(`/analytics/${user._id}`),
          api.post("/recommendations", { studentId: user._id }),
          api.post("/predict-performance", { studentId: user._id }),
        ]);

        setApiAttempts(attemptsResponse.status === "fulfilled" ? attemptsResponse.value.data || [] : []);
        setAnalytics(analyticsResponse.status === "fulfilled" ? analyticsResponse.value.data?.analytics || null : null);
        setRecommendations(
          recommendationsResponse.status === "fulfilled" ? recommendationsResponse.value.data?.recommendations || null : null
        );
        setPrediction(predictionResponse.status === "fulfilled" ? predictionResponse.value.data?.prediction || null : null);
      } catch {
        setApiAttempts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const completedAttempts = apiAttempts.filter((attempt) => attempt.status === "COMPLETED");
  const totalTests = completedAttempts.length;
  const avgAccuracy = analytics?.averageAccuracy ?? (totalTests > 0
    ? Math.round(completedAttempts.reduce((sum, attempt) => sum + Number(attempt.accuracy || 0), 0) / totalTests)
    : 0);
  const avgScore = analytics?.averageScore ?? (totalTests > 0
    ? Math.round(completedAttempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / totalTests)
    : 0);
  const topicChartData = analytics?.topicPerformance.slice(0, 6).map((topic) => ({
    name: topic.topic,
    accuracy: topic.accuracy,
  })) || [];
  const progressChartData = analytics?.progressOverTime.map((attempt) => ({
    name: attempt.testTitle.length > 14 ? `${attempt.testTitle.slice(0, 14)}...` : attempt.testTitle,
    accuracy: attempt.accuracy,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12 max-w-6xl">
        <Link
          to="/exams"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Exams
        </Link>

        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Results</h1>
            <p className="text-muted-foreground mt-1">Track your performance, AI insights, and next-step preparation plan.</p>
          </div>
          {prediction && (
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] px-5 py-4 text-sm text-foreground shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Next Test Forecast</div>
              <div className="mt-2 text-2xl font-bold">{prediction.expectedAccuracy}%</div>
              <div className="text-muted-foreground">Expected accuracy if you follow the current improvement path</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
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
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <TrendingUp className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{loading || !prediction ? "—" : `${prediction.probabilityOfImprovement}%`}</p>
            <p className="text-xs text-muted-foreground">Improvement Chance</p>
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
              Start a mock test to unlock AI analytics and recommendations.
            </p>
            <Link
              to="/exams"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Browse Exams →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {analytics && (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-primary">
                    <Brain className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">AI Summary</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-foreground">{analytics.aiSummary || "Your analytics summary will appear here after more attempts."}</p>
                  {analytics.aiStudyPlan.length > 0 && (
                    <div className="mt-5 space-y-2">
                      {analytics.aiStudyPlan.map((item) => (
                        <div key={item} className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-foreground">
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {prediction && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-primary">
                      <Target className="h-5 w-5" />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em]">Prediction</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground">Expected Rank</div>
                        <div className="text-2xl font-bold text-foreground">#{prediction.expectedRank}</div>
                      </div>
                      <div className="rounded-2xl bg-muted/50 p-4">
                        <div className="text-xs text-muted-foreground">Expected Accuracy</div>
                        <div className="text-2xl font-bold text-foreground">{prediction.expectedAccuracy}%</div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-foreground">{prediction.insight}</p>
                  </motion.div>
                )}
              </div>
            )}

            {analytics && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Topic Accuracy</h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Progress Over Time</h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" height={60} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {recommendations && (
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">Recommendations</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-foreground">{recommendations.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {recommendations.topicsToRevise.map((topic) => (
                      <span key={topic} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 space-y-2">
                    {recommendations.practiceSuggestions.map((suggestion) => (
                      <div key={suggestion} className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-foreground">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics && (
                <div className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Weakest Topics Ranking</h2>
                  </div>
                  <div className="space-y-3">
                    {analytics.weakestTopicsRanking.map((topic, index) => (
                      <div key={topic.topic} className="rounded-2xl border bg-muted/20 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Rank {index + 1}</div>
                            <div className="mt-1 text-base font-semibold text-foreground">{topic.topic}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-foreground">{topic.accuracy}%</div>
                            <div className="text-xs text-muted-foreground">{topic.correct}/{topic.total} correct</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Your Tests
              </h2>
              {completedAttempts.map((attempt, i) => {
                const accuracy = attempt.accuracy || (attempt.totalQuestions > 0
                  ? Math.round((attempt.score / Math.max(attempt.totalMarks || attempt.totalQuestions, 1)) * 100)
                  : 0);
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
                        <h3 className="font-semibold text-foreground">{attempt.testTitle}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {date}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        accuracy >= 70
                          ? "bg-green-100 text-green-700"
                          : accuracy >= 40
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                      }`}>
                        {accuracy}% accuracy
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-3">
                      <div className="text-center bg-muted/50 rounded-lg py-2">
                        <p className="text-sm font-bold text-foreground">{attempt.score}</p>
                        <p className="text-[10px] text-muted-foreground">Score</p>
                      </div>
                      <div className="text-center bg-muted/50 rounded-lg py-2">
                        <p className="text-sm font-bold text-foreground">{attempt.totalQuestions}</p>
                        <p className="text-[10px] text-muted-foreground">Questions</p>
                      </div>
                      <div className="text-center bg-muted/50 rounded-lg py-2">
                        <p className="text-sm font-bold text-foreground">{attempt.totalMarks || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">Total Marks</p>
                      </div>
                      <div className="text-center bg-muted/50 rounded-lg py-2">
                        <p className="text-sm font-bold text-foreground">
                          {attempt.timeTakenSeconds ? `${Math.round(attempt.timeTakenSeconds / 60)}m` : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Time</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
