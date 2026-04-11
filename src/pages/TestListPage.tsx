import { useMemo } from "react";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import api from '@/services/api';
import { findExamInCatalog, type DynamicExam } from '@/lib/examCatalog';
import { useExams } from '@/hooks/useExams';

const normalizeLabel = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normalizeClientId = (value: unknown) => (typeof value === "string" ? value : String(value ?? ""));

export default function TestListPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { exams: dynamicExams, loading: examsLoading } = useExams();
  const testsQuery = useQuery({
    queryKey: ["exam-tests", examId],
    enabled: Boolean(examId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data: testData } = await api.get(`/tests/exam/${examId}`);
      return (testData || []).map((t: any) => ({
        testId: normalizeClientId(t._id),
        testName: t.title,
        subject: t.subject,
        subjects: t.subjects || [t.subject],
        totalQuestions: t.totalQuestions || 0,
        totalMarks: t.totalMarks,
        duration: t.durationMinutes,
        type: (t.subjects?.length || 0) > 1 || t.subject === 'All Subjects' ? 'full-length' : 'subject',
      }));
    },
  });

  const loading = examsLoading || (testsQuery.isPending && !testsQuery.data);
  const exam = findExamInCatalog(examId || '', dynamicExams as DynamicExam[]);
  const tests = testsQuery.data ?? [];
  const subjectTests = useMemo(() => tests.filter((test) => test.type === 'subject'), [tests]);
  const fullLengthTests = useMemo(() => tests.filter((test) => test.type === 'full-length'), [tests]);
  const groupedSubjects = useMemo(() => {
    const grouped: Record<string, typeof subjectTests> = {};
    subjectTests.forEach((test) => {
      const subject = test.subject;
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(test);
    });
    return grouped;
  }, [subjectTests]);

  if (loading && !exam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Exam not found</h1>
          <Link to="/exams" className="mt-4 inline-block text-primary hover:underline">Back to Exams</Link>
        </div>
      </div>
    );
  }

  const matchedFullLengthTestIds = new Set<string>();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">{exam.icon}</span>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{exam.examName} Mock Tests</h1>
            <p className="text-muted-foreground">{exam.description || 'Practice with real-time exam simulation.'}</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Dynamic / Subject-wise Tests */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Subject-wise Tests</h2>
        <div className="space-y-6 mb-12">
          {Object.entries(groupedSubjects).map(([subject, subTests]) => (
            <div key={subject}>
              <h3 className="text-lg font-semibold text-foreground mb-3">{subject}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subTests.map((test, i) => (
                  <motion.div
                    key={test.testId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-primary/5 hover:border-primary/20 transition-all group"
                  >
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{test.testName}</h4>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {test.totalQuestions} Qs</span>
                      <span>{test.totalMarks} Marks</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {test.duration} min</span>
                    </div>
                    {test.subject !== "All Subjects" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {(() => {
                          const subjectRule = exam.subjects.find((subjectItem) => subjectItem.subjectName === test.subject);
                          return `Marking: +${subjectRule?.marksPerQuestion ?? 1} / -${subjectRule?.negativeMarksPerQuestion ?? 0}`;
                        })()}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="mt-4 gap-1 w-full"
                      onClick={() => navigate(`/test/${test.testId}`)}
                    >
                      Start Test <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Full Length Tests */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Full Length Tests</h2>
        <div className="space-y-6">
          {/* Static Full Length Sections */}
          {exam.fullLengthTests.map(flt => {
            const expectedSubjects = flt.subjects.map(subject => normalizeLabel(subject.subjectName)).sort().join("|");
            const fltTests = fullLengthTests.filter(t => {
              const testSubjects = (t.subjects || [t.subject]).map((subject: string) => normalizeLabel(subject)).sort().join("|");
              const subjectMatch = expectedSubjects.length > 0 && testSubjects === expectedSubjects;
              const idMatch = normalizeLabel(t.testName).includes(normalizeLabel(flt.testName)) || normalizeClientId(t.testId).includes(flt.testId);
              return subjectMatch || idMatch;
            });
            fltTests.forEach(test => matchedFullLengthTestIds.add(test.testId));
            
            return (
              <div key={flt.testId}>
                <h3 className="text-lg font-semibold text-foreground mb-3">{flt.testName} <span className="text-sm font-normal text-muted-foreground">({flt.totalQuestions} Qs)</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fltTests.map((test, i) => (
                    <motion.div
                      key={test.testId}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm hover:shadow-md transition-all"
                    >
                        <h4 className="font-semibold text-foreground">{test.testName}</h4>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">Q: {test.totalQuestions}</span>
                            <span>{test.totalMarks} M</span>
                            <span className="flex items-center gap-1">{test.duration} min</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {exam.subjects.some((subject) => (subject.negativeMarksPerQuestion ?? 0) > 0)
                            ? `Negative marking enabled up to -${Math.max(...exam.subjects.map((subject) => subject.negativeMarksPerQuestion ?? 0))}`
                            : "No negative marking"}
                        </p>
                        <Button
                            size="sm"
                            className="mt-4 w-full"
                            onClick={() => navigate(`/test/${test.testId}`)}
                        >
                            Start Full Test
                        </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Collect Any Remaining Full Length Tests (Dynamic ones that didn't match sections) */}
          {fullLengthTests.filter(t => !matchedFullLengthTestIds.has(t.testId)).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Additional Full Length Tests</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fullLengthTests.filter(t => !matchedFullLengthTestIds.has(t.testId)).map((test, i) => (
                   <motion.div
                    key={test.testId}
                    className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm hover:shadow-md transition-all"
                    >
                    <h4 className="font-semibold text-foreground">{test.testName}</h4>
                    <p className="text-xs text-muted-foreground">{test.subject}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{test.totalQuestions} Qs</span>
                        <span>{test.totalMarks} Marks</span>
                        <span>{test.duration} min</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {exam.subjects.some((subject) => (subject.negativeMarksPerQuestion ?? 0) > 0)
                        ? `Negative marking enabled up to -${Math.max(...exam.subjects.map((subject) => subject.negativeMarksPerQuestion ?? 0))}`
                        : "No negative marking"}
                    </p>
                    <Button size="sm" className="mt-4 w-full" onClick={() => navigate(`/test/${test.testId}`)}>Start Test</Button>
                   </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
